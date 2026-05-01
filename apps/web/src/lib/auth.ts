"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { create } from "zustand";

import api from "./api";

// ── Types ──
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  systemRole?: string;
  emailVerified?: boolean;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;

  // Actions
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

// ── Client-side hint cookie helpers ──
// These set a non-httpOnly cookie that the Next.js middleware can read
// to provide soft redirects (the real auth is the httpOnly refresh token)
function setAuthHint() {
  if (typeof document !== "undefined") {
    document.cookie = "tasklane_authed=1; path=/; max-age=604800; SameSite=Lax";
  }
}

function clearAuthHint() {
  if (typeof document !== "undefined") {
    document.cookie = "tasklane_authed=; path=/; max-age=0; SameSite=Lax";
  }
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  accessToken: null,
  status: "loading",

  setUser: (user) => set({ user, status: "authenticated" }),

  setAccessToken: (token) => set({ accessToken: token }),

  clearAuth: () => {
    clearAuthHint();
    set({ user: null, accessToken: null, status: "unauthenticated" });
  },

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAuthHint();
    set({
      user: data.user,
      accessToken: data.accessToken,
      status: "authenticated",
    });
    return data.user;
  },

  register: async (email, password, name) => {
    const { data } = await api.post("/auth/register", {
      email,
      password,
      name,
    });
    setAuthHint();
    set({
      user: data.user,
      accessToken: data.accessToken,
      status: "authenticated",
    });
    return data.user;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if logout fails server-side, clear local state
    }
    clearAuthHint();
    set({ user: null, accessToken: null, status: "unauthenticated" });
  },

  hydrate: async () => {
    try {
      // Try to refresh token (cookie-based) and get user
      const { data } = await api.post("/auth/refresh");
      setAuthHint();
      set({
        user: data.user,
        accessToken: data.accessToken,
        status: "authenticated",
      });
    } catch {
      clearAuthHint();
      set({ status: "unauthenticated" });
    }
  },
}));

// ── Hooks ──

export function useAuth() {
  return useAuthStore();
}

export function useRequireAuth() {
  const { status } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  return useAuthStore();
}
