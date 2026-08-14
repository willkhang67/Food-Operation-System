import type {
  AuthUser,
  LoginCredentials,
  RegisterPayload,
  RegisterResponse,
  SessionResponse,
} from "@/types";
import { apiFetch, type QueryOptions } from "./client";

/**
 * Talks to the BFF auth routes, which own the cookies. Nothing here ever sees a
 * token, so there is no client-side refresh to coordinate: a 401 from any call
 * means the session is genuinely over.
 */
export const authApi = {
  async login(credentials: LoginCredentials, options?: QueryOptions): Promise<AuthUser> {
    const { user } = await apiFetch<SessionResponse>("/auth/login", {
      ...options,
      method: "POST",
      body: credentials,
    });
    return user;
  },

  /** Returns `sessionStarted: false` when the account was created but not signed in. */
  register(payload: RegisterPayload, options?: QueryOptions): Promise<RegisterResponse> {
    return apiFetch<RegisterResponse>("/auth/register", {
      ...options,
      method: "POST",
      body: payload,
    });
  },

  logout(options?: QueryOptions): Promise<void> {
    return apiFetch<void>("/auth/logout", { ...options, method: "POST" });
  },

  async refresh(options?: QueryOptions): Promise<AuthUser> {
    const { user } = await apiFetch<SessionResponse>("/auth/refresh", {
      ...options,
      method: "POST",
    });
    return user;
  },

  /** Throws ApiError with code UNAUTHENTICATED when there is no session. */
  async me(options?: QueryOptions): Promise<AuthUser> {
    const { user } = await apiFetch<SessionResponse>("/auth/me", options);
    return user;
  },
};
