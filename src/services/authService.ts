/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { apiFetch, setAuthToken } from "./api";
import type { LoginRequest, LoginResponse } from "@/types/auth";

export const loginRequest = async (payload: LoginRequest): Promise<LoginResponse> => {
  const data = await apiFetch<LoginResponse>(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  // Persist token for future calls
  setAuthToken(data.token);
  return data;
};

export const logoutRequest = async () => {
  setAuthToken(null);
};
