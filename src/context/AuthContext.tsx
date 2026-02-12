/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext } from "react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role_id: number;
  role?: {
    id: number;
    name: string;
  };
  photo_url?: string | null;
  is_employee?: boolean;
  phone?: string | null;
  address?: string | null;
  hire_date?: string | null;
  // Códigos de permisos asignados al usuario (derivados de su rol)
  permissions?: string[];
}

export type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default AuthContext;
