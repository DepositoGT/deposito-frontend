import { useEffect, useMemo, useState } from "react";
import { AuthContext, type AuthUser } from "./AuthContext";
import { getAuthToken, setAuthToken } from "@/services/api";

const AUTH_KEY = "auth:isAuthenticated";
const USER_KEY = "auth:user";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      }
    } else if (localStorage.getItem(AUTH_KEY) === "true") {
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, String(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    const onUnauthorized = () => {
      setAuthToken(null);
      localStorage.removeItem(USER_KEY);
      setIsAuthenticated(false);
      setUser(null);
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      login: () => {
        setIsAuthenticated(true);
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error("Error parsing user on login:", e);
          }
        }
      },
      logout: () => {
        setAuthToken(null);
        localStorage.removeItem(USER_KEY);
        setIsAuthenticated(false);
        setUser(null);
      },
    }),
    [isAuthenticated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
