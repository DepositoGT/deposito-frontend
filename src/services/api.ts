/**
 * API Base URL - uses VITE_API_URL from environment
 * In development: http://localhost:3000/api
 * In production: https://your-backend.vercel.app/api
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

// Export for use in other files that need direct access
export const getApiBaseUrl = () => API_BASE_URL;

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

  // Clean path - remove leading /api if present since API_BASE_URL already includes it
  let cleanPath = path;
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4); // Remove '/api'
  } else if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  const res = await fetch(`${API_BASE_URL}${cleanPath}`, {
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

// Alerts helpers
export interface AlertAssignPayload { user_id: string }
export const reassignAlert = async (id: string, user_id: string) => {
  return apiFetch(`/api/alerts/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ user_id } as AlertAssignPayload),
  })
}

export const resolveAlert = async (id: string) => {
  return apiFetch(`/api/alerts/${id}/resolve`, {
    method: 'PATCH',
  })
}
