/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

/**
 * API Base URL - uses VITE_API_URL from environment
 * In development: http://localhost:3000/api
 * In production: https://your-backend.vercel.app/api
 */
const VITE_API_URL = import.meta.env.VITE_API_URL;

if (!VITE_API_URL) {
  throw new Error('VITE_API_URL no está definida')
}


// Export for use in other files that need direct access
export const getApiBaseUrl = () => VITE_API_URL;

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

/**
 * Empresa y sucursal activas: viajan como X-Company-Id / X-Branch-Id en cada
 * request. El backend valida la pertenencia; si no se mandan, usa la sucursal
 * por defecto del usuario. `all` en la sucursal = vista consolidada (solo GET).
 */
const COMPANY_KEY = "tenant:companyId";
const BRANCH_KEY = "tenant:branchId";

export const getActiveCompanyId = () => localStorage.getItem(COMPANY_KEY);
export const getActiveBranchId = () => localStorage.getItem(BRANCH_KEY);

export const setActiveTenant = (companyId: string | null, branchId: string | null) => {
  if (companyId) localStorage.setItem(COMPANY_KEY, companyId);
  else localStorage.removeItem(COMPANY_KEY);
  if (branchId) localStorage.setItem(BRANCH_KEY, branchId);
  else localStorage.removeItem(BRANCH_KEY);
  window.dispatchEvent(new Event("tenant:changed"));
};

export const tenantHeaders = (): Record<string, string> => {
  const companyId = getActiveCompanyId();
  const branchId = getActiveBranchId();
  return {
    ...(companyId ? { "X-Company-Id": companyId } : {}),
    ...(branchId ? { "X-Branch-Id": branchId } : {}),
  };
};

/**
 * Todo request al backend lleva empresa y sucursal, aunque no pase por
 * `apiFetch`: hay ~35 llamadas con `fetch` directo (PDFs, importaciones,
 * subida de imágenes, cierre de caja, cajas) y olvidar los headers en una sola
 * hace que ese módulo muestre datos de otra sucursal. Interceptar una vez es
 * más seguro que recordarlo en cada llamada nueva.
 * ponytail: no toca URLs ajenas (Supabase, CDNs) ni pisa headers ya puestos.
 */
const installTenantHeaders = () => {
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(VITE_API_URL)) return original(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    for (const [k, v] of Object.entries(tenantHeaders())) {
      if (!headers.has(k)) headers.set(k, v);
    }
    return original(input, { ...init, headers });
  };
};

installTenantHeaders();

// El refresh es idempotente por sesión: si varias requests reciben 401 a la vez,
// comparten un único POST /auth/refresh en lugar de rotar el token N veces.
let refreshInFlight: Promise<boolean> | null = null;
const tryRefresh = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${VITE_API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

// No intentar refrescar sobre las propias rutas de sesión (evita loops).
const isSessionPath = (p: string) =>
  /\/auth\/(login|refresh|logout)\b/.test(p);

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
  _retried = false
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...tenantHeaders(),
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

  const res = await fetch(`${VITE_API_URL}${cleanPath}`, {
    ...options,
    headers,
    credentials: "include", // manda las cookies httpOnly de sesión
  });

  // Access token vencido: intentar refrescar una vez y reintentar la request original.
  if (res.status === 401 && !_retried && !isSessionPath(cleanPath)) {
    if (await tryRefresh()) {
      return apiFetch<T>(path, options, true);
    }
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!res.ok) {
        const preview = text.length > 180 ? `${text.slice(0, 180)}…` : text;
        throw new ApiError(
          preview.trim() || `${res.status} ${res.statusText || "Error"}`,
          res.status
        );
      }
      throw new ApiError(
        "La respuesta del servidor no es JSON válido",
        res.status,
        { rawSnippet: text.slice(0, 240) }
      );
    }
  }

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
    const msg =
      data && typeof data === "object" && data !== null && ("message" in data || "error" in data)
        ? String((data as { message?: string; error?: string }).message ||
            (data as { message?: string; error?: string }).error ||
            "")
        : "";
    const message = msg || res.statusText || "Error";
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
