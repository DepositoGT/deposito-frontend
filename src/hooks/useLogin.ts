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

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (payload) => loginRequest(payload),
    onSuccess: (data) => {
      // El backend ya devuelve el user con permisos y rol; sólo lo cacheamos para la UI.
      localStorage.setItem("auth:user", JSON.stringify(data.user));
      login();
      navigate("/", { replace: true });
    },
  });
};
