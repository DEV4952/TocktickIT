import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, AuthResponse } from "../types.js";
import { loginApi, logoutApi, getMeApi, changePasswordApi } from "../api.js";

const TOKEN_KEY = "toktickit_auth_token";
const USER_KEY = "toktickit_auth_user";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await getMeApi(savedToken);
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      }
    } catch {
      // If unauthorized or error, clear storage
      setUser(null);
      setToken(null);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginApi(email, password);
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        if (res.token) {
          setToken(res.token);
          localStorage.setItem(TOKEN_KEY, res.token);
        }
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to log in.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const savedToken = token || localStorage.getItem(TOKEN_KEY);
        const res = await changePasswordApi(currentPassword, newPassword, confirmPassword, savedToken);
        if (res && res.user) {
          setUser(res.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update password.";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
