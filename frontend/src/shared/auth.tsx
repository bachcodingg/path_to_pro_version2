import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  // The saved session could not be checked (no network, server down): still signed in, nothing loaded
  failed: boolean;
  retry: () => void;
  // A second step (authenticator code) comes back as { mfaToken } instead of the user
  login: (email: string, password: string) => Promise<User | { mfaToken: string }>;
  finishMfa: (mfaToken: string, code: string) => Promise<User>;
  adopt: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// Who was signed in last time, so the installed app opens without a network: the service
// worker answers the player's own pages from its cache (vite.config.ts). Cleared at sign-out.
const USER_KEY = "pathtopro.user";
function remembered(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
  } catch {
    return null;
  }
}
function remember(u: User | null): void {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* private mode: nothing is remembered */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const [failed, setFailed] = useState(false);

  // Only a refused session signs the browser out. A request that never got an answer keeps
  // the session and says so, instead of dropping to the sign-in page without a word.
  const check = useCallback(() => {
    if (!getToken()) return;
    setLoading(true);
    setFailed(false);
    api<User>("/api/auth/me")
      .then((u) => {
        remember(u);
        setUser(u);
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setToken(null);
          remember(null);
          return;
        }
        // No answer (offline, server down): carry on as the person signed in last time
        const last = remembered();
        if (last) setUser(last);
        else setFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(check, [check]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User } | { mfa_required: true; mfa_token: string }>("/api/auth/login", {
      method: "POST",
      json: { email, password },
    });
    if ("mfa_token" in res) return { mfaToken: res.mfa_token };
    setToken(res.token);
    remember(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const finishMfa = useCallback(async (mfaToken: string, code: string) => {
    const res = await api<{ token: string; user: User }>("/api/auth/login/mfa", { method: "POST", json: { mfa_token: mfaToken, code } });
    setToken(res.token);
    remember(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const adopt = useCallback((token: string, u: User) => {
    setToken(token);
    remember(u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    remember(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, failed, retry: check, login, finishMfa, adopt, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export function homeFor(role: User["role"]): string {
  return { player: "/player", coach: "/coach", physio: "/physio", guardian: "/guardian", admin: "/admin" }[role];
}
