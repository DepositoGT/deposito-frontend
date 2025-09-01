/* eslint-disable react-refresh/only-export-components */
import { createContext } from "react";

export type AuthContextType = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default AuthContext;
