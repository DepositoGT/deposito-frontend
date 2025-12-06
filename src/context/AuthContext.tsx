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
}

export type AuthContextType = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default AuthContext;
