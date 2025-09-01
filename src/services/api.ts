const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let authTokenCache: string | null = null;

export const getAuthToken = () => authTokenCache ?? localStorage.getItem("auth:token");
export const setAuthToken = (token: string | null) => {
  authTokenCache = token;
  if (token) localStorage.setItem("auth:token", token);
  else localStorage.removeItem("auth:token");
};

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    if (res.status === 401) {
      // Global unauthorized handling: clear token and notify app
      try {
        setAuthToken(null);
        localStorage.setItem("auth:isAuthenticated", "false");
        // Notify listeners (e.g., AuthProvider) to trigger logout flow
        window.dispatchEvent(new Event("auth:unauthorized"));
      } catch {
        // no-op
      }
    }
    const message = (data && (data.message || data.error)) || res.statusText || "Error";
    throw new ApiError(String(message), res.status, data);
  }

  return data as T;
};
