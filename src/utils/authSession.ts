const ACCESS_TOKEN_KEY = "ats.auth.access";
const REFRESH_TOKEN_KEY = "ats.auth.refresh";
const DEVICE_TOKEN_KEY = "ats.device.token";
const ROLE_KEY = "ats.auth.role";
const RECRUITER_COMPANY_STAGE_KEY = "ats.recruiter.company.stage";
const SESSION_EXPIRES_AT_KEY = "ats.auth.expiresAt";
const SESSION_NOTICE_KEY = "ats.auth.notice";
const INVITE_TOKEN_KEY = "ats.auth.inviteToken";

const SESSION_NOTICE_TTL_MS = 15 * 60 * 1000;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type CompanyStage = "no-company" | "pending-approval" | "approved";

type OnboardingShape = {
  has_company?: boolean;
  hasCompany?: boolean;
  is_verified?: boolean;
  company_is_verified?: boolean;
  user?: {
    has_company?: boolean;
    hasCompany?: boolean;
    is_verified?: boolean;
    company?: {
      is_verified?: boolean;
    } | null;
  };
  company?: {
    is_verified?: boolean;
  } | null;
};

const getSessionExpiry = () => {
  const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
  if (!raw) {
    return null;
  }

  const timestamp = Number(raw);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const hasStoredAuthSession = () => {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY));
};

const isAuthSessionExpired = () => {
  if (!hasStoredAuthSession()) {
    return false;
  }

  const expiresAt = getSessionExpiry();
  if (!expiresAt) {
    return true;
  }

  return Date.now() >= expiresAt;
};

export const setSessionExpiredNotice = (message = "Your session expired. Please sign in again.") => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    SESSION_NOTICE_KEY,
    JSON.stringify({
      message,
      expiresAt: Date.now() + SESSION_NOTICE_TTL_MS,
    }),
  );
};

const ensureSessionIsValid = () => {
  if (!isAuthSessionExpired()) {
    return true;
  }

  clearAuthSession();
  setSessionExpiredNotice();
  return false;
};

export const getAccessToken = () => {
  if (!ensureSessionIsValid()) {
    return null;
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = () => {
  if (!ensureSessionIsValid()) {
    return null;
  }
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const getAuthRole = () => {
  if (!ensureSessionIsValid()) {
    return null;
  }
  return localStorage.getItem(ROLE_KEY);
};

export const getRecruiterCompanyStage = () => {
  const value = localStorage.getItem(RECRUITER_COMPANY_STAGE_KEY);
  if (value === "no-company" || value === "pending-approval" || value === "approved") {
    return value;
  }
  return null;
};

export const saveRecruiterCompanyStage = (stage: CompanyStage) => {
  localStorage.setItem(RECRUITER_COMPANY_STAGE_KEY, stage);
};

const pickBoolean = (...values: Array<boolean | undefined | null>) => {
  const bool = values.find((value) => typeof value === "boolean");
  return typeof bool === "boolean" ? bool : undefined;
};

export const resolveRecruiterCompanyStage = (payload: OnboardingShape): CompanyStage => {
  const hasCompany = pickBoolean(
    payload.has_company,
    payload.hasCompany,
    payload.user?.has_company,
    payload.user?.hasCompany,
    payload.company ? true : undefined,
    payload.user?.company ? true : undefined,
  );

  if (!hasCompany) {
    return "no-company";
  }

  const isVerified = pickBoolean(
    payload.company_is_verified,
    payload.is_verified,
    payload.company?.is_verified,
    payload.user?.company?.is_verified,
    payload.user?.is_verified,
  );

  if (isVerified === false) {
    return "pending-approval";
  }

  return "approved";
};

export const saveAuthRole = (role: "candidate" | "recruiter" | "admin") => {
  localStorage.setItem(ROLE_KEY, role);
};

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

  localStorage.setItem(SESSION_EXPIRES_AT_KEY, `${Date.now() + SESSION_TIMEOUT_MS}`);
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(RECRUITER_COMPANY_STAGE_KEY);
  localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
};

export const getInviteToken = () => localStorage.getItem(INVITE_TOKEN_KEY);

export const saveInviteToken = (token: string) => {
  localStorage.setItem(INVITE_TOKEN_KEY, token);
};

export const clearInviteToken = () => {
  localStorage.removeItem(INVITE_TOKEN_KEY);
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
