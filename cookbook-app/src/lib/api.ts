export const ACCESS_TOKEN_KEY = "cookbook-access-token";
export const REFRESH_TOKEN_KEY = "cookbook-refresh-token";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

type ApiErrorPayload = {
  error?: ApiError;
  detail?: string;
};

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = await response.json();
  if (!data.access) {
    clearTokens();
    return null;
  }

  setTokens(data.access, refresh);
  return data.access as string;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  if (payload?.error) {
    return payload.error;
  }

  return {
    code: "request_failed",
    message: payload?.detail || `Request failed with status ${response.status}.`,
  };
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retryOnAuthFailure = true,
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const access = getAccessToken();
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && retryOnAuthFailure) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return apiRequest<T>(path, init, false);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiDownload(
  path: string,
  init: RequestInit = {},
  retryOnAuthFailure = true,
): Promise<Blob> {
  const headers = new Headers(init.headers || {});
  const access = getAccessToken();
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && retryOnAuthFailure) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return apiDownload(path, init, false);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return await response.blob();
}

export function getApiErrorMessage(error: unknown, fallback = "Request failed.") {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}
