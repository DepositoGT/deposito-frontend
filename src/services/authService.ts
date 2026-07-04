/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { apiFetch } from "./api";
import type { LoginRequest, LoginResponse } from "@/types/auth";

export const loginRequest = async (payload: LoginRequest): Promise<LoginResponse> => {
  // La sesión queda en cookies httpOnly seteadas por el backend; no hay token que guardar.
  return apiFetch<LoginResponse>(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/** Revoca el refresh token en el backend y limpia las cookies. Best-effort. */
export const logoutRequest = async () => {
  try {
    await apiFetch(`/api/auth/logout`, { method: "POST" });
  } catch {
    // aunque falle la red, el front sigue con el logout local
  }
};

/** Usuario actual desde la cookie de sesión (para restaurar sesión al recargar). */
export const fetchMe = async (): Promise<LoginResponse> => {
  return apiFetch<LoginResponse>(`/api/auth/me`);
};
