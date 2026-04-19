const ACCESS_TOKEN_KEY = "ats.auth.access";
const REFRESH_TOKEN_KEY = "ats.auth.refresh";
const DEVICE_TOKEN_KEY = "ats.device.token";
const ROLE_KEY = "ats.auth.role";
const RECRUITER_COMPANY_STAGE_KEY = "ats.recruiter.company.stage";

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

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const getAuthRole = () => localStorage.getItem(ROLE_KEY);

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
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(RECRUITER_COMPANY_STAGE_KEY);
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
