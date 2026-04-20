import axios from "axios";
import { ROUTES } from "../routes/paths";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  saveAuthSession,
  setSessionExpiredNotice,
} from "../utils/authSession";

const DEFAULT_BASE_URL = "http://localhost:8000/api/v1/";
const REFRESH_ENDPOINTS = ["user/token/refresh/", "token/refresh/", "user/refresh/"];

let refreshPromise: Promise<string | null> | null = null;

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const requestUrl = `${config.url || ""}`.toLowerCase();
  const isPublicAuthRoute =
    requestUrl.includes("user/login/") ||
    requestUrl.includes("user/signup/") ||
    requestUrl.includes("user/resend-otp/") ||
    requestUrl.includes("verify-otp/") ||
    requestUrl.includes("user/reset/");

  if (isPublicAuthRoute) {
    if (config.headers && "Authorization" in config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  }

  // For FormData (file uploads), remove Content-Type so browser sets it with correct boundary
  if (config.data instanceof FormData) {
    if (config.headers && "Content-Type" in config.headers) {
      delete config.headers["Content-Type"];
    }
  }

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (typeof window !== "undefined") {
    const hasSessionExpiryNotice = Boolean(window.sessionStorage.getItem("ats.auth.notice"));
    const isLoginRoute =
      window.location.pathname === ROUTES.auth.login ||
      window.location.pathname === ROUTES.auth.recruiterLogin ||
      window.location.pathname === ROUTES.auth.adminLogin;

    if (hasSessionExpiryNotice && !isLoginRoute) {
      window.location.assign(`${ROUTES.auth.login}?reason=session-expired`);
    }
  }
  return config;
});

const refreshAuthSession = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      for (const endpoint of REFRESH_ENDPOINTS) {
        try {
          const response = await axios.post(
            `${API.defaults.baseURL}${endpoint}`,
            { refresh: refreshToken },
            {
              timeout: 15000,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          const data = response.data as {
            access?: string;
            refresh?: string;
            token?: string;
          };

          if (data?.access || data?.token || data?.refresh) {
            saveAuthSession(data);
            return data.access || data.token || null;
          }
        } catch {
          // Try the next known refresh endpoint.
        }
      }

      return null;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.detail || error?.response?.data?.message || "";
    const originalRequest = error?.config;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !`${originalRequest.url || ""}`.toLowerCase().includes("login/") &&
      !`${originalRequest.url || ""}`.toLowerCase().includes("signup/") &&
      !`${originalRequest.url || ""}`.toLowerCase().includes("resend-otp/") &&
      !`${originalRequest.url || ""}`.toLowerCase().includes("verify-otp/") &&
      !`${originalRequest.url || ""}`.toLowerCase().includes("reset/")
    ) {
      originalRequest._retry = true;

      const nextAccessToken = await refreshAuthSession();
      if (nextAccessToken) {
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${nextAccessToken}`,
        };
        return API(originalRequest);
      }
    }

    if (
      status === 401 &&
      typeof message === "string" &&
      (message.toLowerCase().includes("given token not valid for any token type") ||
        message.toLowerCase().includes("token is expired") ||
        message.toLowerCase().includes("token_not_valid"))
    ) {
      clearAuthSession();
      setSessionExpiredNotice();

      if (typeof window !== "undefined") {
        if (window.location.pathname !== ROUTES.auth.login) {
          window.location.assign(`${ROUTES.auth.login}?reason=session-expired`);
        }
      }
    }

    return Promise.reject(error);
  },
);

export default API;