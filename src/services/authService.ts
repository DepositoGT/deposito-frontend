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
