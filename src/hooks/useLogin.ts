/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "@/services/authService";
import type { LoginRequest, LoginResponse } from "@/types";
import { useAuth } from "@/context/useAuth";

type JwtPayload = {
  permissions?: string[];
  role?: { id: number; name: string };
  role_id?: number;
  role_name?: string;
};

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (payload) => loginRequest(payload),
    onSuccess: (data) => {
      // Enriquecer el usuario con permisos y rol desde el JWT
      const payload = decodeJwt(data.token);
      const enrichedUser = {
        ...data.user,
        permissions: payload?.permissions ?? (data.user as any).permissions ?? [],
        role:
          payload?.role ??
          data.user.role ??
          (payload?.role_id
            ? {
                id: payload.role_id,
                name: payload.role_name ?? data.user.role?.name ?? "",
              }
            : data.user.role),
      } as any;

      // Guardar usuario enriquecido en localStorage
      localStorage.setItem("auth:user", JSON.stringify(enrichedUser));

      // Actualizar contexto de auth desde localStorage
      login();
      navigate("/", { replace: true });
    },
  });
};
