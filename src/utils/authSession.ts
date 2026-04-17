const ACCESS_TOKEN_KEY = "ats.auth.access";
const REFRESH_TOKEN_KEY = "ats.auth.refresh";
const DEVICE_TOKEN_KEY = "ats.device.token";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const saveAuthSession = (payload: {
  access?: string;
  refresh?: string;
  token?: string;
}) => {
  const accessToken = payload.access || payload.token;
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (payload.refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh);
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getOrCreateDeviceToken = () => {
  const existing = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (existing) {
    return existing;
  }

  const source = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    `${new Date().getTimezoneOffset()}`,
    crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  ].join("|");

  const encoded = btoa(source).replace(/=/g, "");
  const token = encoded.slice(0, 180);
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
  return token;
};
