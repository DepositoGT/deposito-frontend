import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { getAuthToken, setAuthToken } from "@/services/api";

const AUTH_KEY = "auth:isAuthenticated";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsAuthenticated(true);
    } else if (localStorage.getItem(AUTH_KEY) === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, String(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    const onUnauthorized = () => {
      setAuthToken(null);
      localStorage.removeItem("auth:user");
      setIsAuthenticated(false);
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      login: () => {
        setIsAuthenticated(true);
      },
      logout: () => {
        setAuthToken(null);
        localStorage.removeItem("auth:user");
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
