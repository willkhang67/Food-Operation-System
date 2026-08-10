"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, isAbortError, isApiError } from "@/lib/api";
import {
  ApiErrorCode,
  type AuthUser,
  type LoginCredentials,
  type RegisterPayload,
} from "@/types";

/**
 * `unavailable` is deliberately distinct from `anonymous`: the API being
 * unreachable is not evidence that the visitor is signed out, and the UI should
 * not treat it as such.
 */
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "unavailable";

export interface RegisterResult {
  sessionStarted: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }

  return value;
}

interface AuthProviderProps {
  children: ReactNode;
  /** Lets a Server Component seed the session so the header does not start blank. */
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [status, setStatus] = useState<AuthStatus>(initialUser ? "authenticated" : "loading");

  const resolve = useCallback(async (signal?: AbortSignal) => {
    try {
      setUser(await authApi.me({ signal }));
      setStatus("authenticated");
    } catch (error) {
      if (isAbortError(error)) return;

      setUser(null);
      // Only an explicit 401 proves there is no session. Anything else means
      // the answer is unknown right now.
      setStatus(
        isApiError(error) && error.code === ApiErrorCode.Unauthenticated
          ? "anonymous"
          : "unavailable",
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // resolve() reaches its first setState only after awaiting the network, so
    // this is not the synchronous cascade the rule guards against — the rule
    // cannot see through the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void resolve(controller.signal);
    return () => controller.abort();
  }, [resolve]);

  // Errors from these actions are intentionally not swallowed: the form that
  // triggered them is the only place that can show them usefully.
  const login = useCallback(async (credentials: LoginCredentials) => {
    setUser(await authApi.login(credentials));
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResult> => {
    const result = await authApi.register(payload);

    if (result.sessionStarted) {
      setUser(result.user);
      setStatus("authenticated");
    }

    return { sessionStarted: result.sessionStarted };
  }, []);

  const logout = useCallback(async () => {
    // State is cleared only after the server confirms, so a failed sign-out
    // never leaves the UI claiming to be signed out while cookies survive.
    await authApi.logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const reload = useCallback(() => resolve(), [resolve]);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout, reload }}>
      {children}
    </AuthContext.Provider>
  );
}
