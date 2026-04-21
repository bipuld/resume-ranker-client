const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1/";
const DEFAULT_BACKEND_ORIGIN = "http://localhost:8000";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    DEFAULT_API_BASE_URL
  ).trim();
};

export const getBackendOrigin = () => {
  const configuredOrigin = import.meta.env.VITE_BACKEND_ORIGIN?.trim();
  if (configuredOrigin) {
    return trimTrailingSlash(configuredOrigin);
  }

  const apiBaseUrl = getApiBaseUrl();
  try {
    return trimTrailingSlash(new URL(apiBaseUrl).origin);
  } catch {
    const originCandidate = apiBaseUrl
      .replace(/\/?api\/v\d+\/?$/i, "")
      .replace(/\/?api\/?$/i, "")
      .trim();

    return trimTrailingSlash(originCandidate || DEFAULT_BACKEND_ORIGIN);
  }
};

export const resolveBackendUrl = (path: string) => {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return "";
  }

  if (/^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(trimmedPath) || trimmedPath.startsWith("data:")) {
    return trimmedPath;
  }

  const backendOrigin = getBackendOrigin();
  try {
    return new URL(trimmedPath, `${backendOrigin}/`).toString();
  } catch {
    const normalizedPath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
    return `${backendOrigin}${normalizedPath}`;
  }
};