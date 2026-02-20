"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ twoFactorRequired: boolean; tempToken?: string }>;
  signup: (name: string, email: string, password: string, username?: string) => Promise<{ emailVerificationRequired: boolean; emailSent: boolean }>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<string>;
  verify2FALogin: (tempToken: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check maintenance status (client-side)
  useEffect(() => {
    fetch(`${API_BASE_URL}/maintenance-status/`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.enabled && pathname !== "/maintenance") {
          router.replace("/maintenance");
        } else if (data && !data.enabled && pathname === "/maintenance") {
          router.replace("/");
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  const publicPaths = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password", "/maintenance"];

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !user && !publicPaths.includes(pathname)) {
      router.replace("/login");
    }
  }, [isLoading, user, pathname, router]);
  useEffect(() => {
    const stored = localStorage.getItem("auth_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("auth_user");
      }
    }

    // Validate session with backend
    fetch(`${API_BASE_URL}/auth/me/`, { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          const authUser: AuthUser = {
            id: data.user.id,
            name: data.user.name,
            username: data.user.username || '',
            email: data.user.email,
          };
          setUser(authUser);
          localStorage.setItem("auth_user", JSON.stringify(authUser));
        } else {
          // Not authenticated - clear local state
          setUser(null);
          localStorage.removeItem("auth_user");
        }
      })
      .catch(() => {
        // Network error - keep optimistic state from localStorage
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ twoFactorRequired: boolean; tempToken?: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Check if 2FA is required
    if (data['2fa_required']) {
      return { twoFactorRequired: true, tempToken: data.temp_token };
    }

    const authUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      username: data.user.username || '',
      email: data.user.email,
    };

    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);
    return { twoFactorRequired: false };
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, username?: string): Promise<{ emailVerificationRequired: boolean; emailSent: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, ...(username ? { username } : {}) }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Signup failed");
    }

    if (data.email_verification_required) {
      // Don't log in - user needs to verify email first
      return {
        emailVerificationRequired: true,
        emailSent: data.email_sent ?? false,
      };
    }

    // No verification required - cookies already set by backend
    const authUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      username: data.user.username || '',
      email: data.user.email,
    };

    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);

    return { emailVerificationRequired: false, emailSent: false };
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Verification failed");
    }

    const authUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      username: data.user.username || '',
      email: data.user.email,
    };

    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const resendVerification = useCallback(async (email: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to resend verification email");
    }

    return data.message;
  }, []);

  const verify2FALogin = useCallback(async (tempToken: string, code: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/2fa/verify/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ temp_token: tempToken, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "2FA verification failed");
    }

    const authUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      username: data.user.username || '',
      email: data.user.email,
    };

    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to send reset email");
    }

    return data.message;
  }, []);

  const resetPassword = useCallback(async (token: string, password: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Password reset failed");
    }

    return data.message;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors - clear local state regardless
    }
    setUser(null);
    localStorage.removeItem("auth_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        verifyEmail,
        resendVerification,
        verify2FALogin,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
