import axios from "axios";
import { clearAuthSession, getAccessToken } from "../utils/authSession";

const DEFAULT_BASE_URL = "http://localhost:8000/api/v1/";

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

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.detail || error?.response?.data?.message || "";

    if (
      status === 401 &&
      typeof message === "string" &&
      message.toLowerCase().includes("given token not valid for any token type")
    ) {
      clearAuthSession();
    }

    return Promise.reject(error);
  },
);

export default API;