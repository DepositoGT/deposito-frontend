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
      login();
      // Optional: store user info if desired
      localStorage.setItem("auth:user", JSON.stringify(data.user));
      navigate("/", { replace: true });
    },
  });
};
