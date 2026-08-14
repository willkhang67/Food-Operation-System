import "server-only";

import type { AuthUser, LoginCredentials, RegisterPayload } from "@/types";
import { bearer, jsonRequest, upstreamJson, type UpstreamResult } from "../http/upstream";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Duration strings from the API, e.g. "30m" / "7d". */
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface UpstreamAuthResponse extends TokenPair {
  tokenType: "Bearer";
  user: AuthUser;
}

export function loginUpstream(
  credentials: LoginCredentials,
): Promise<UpstreamResult<UpstreamAuthResponse>> {
  return upstreamJson<UpstreamAuthResponse>("/auth/login", jsonRequest("POST", credentials));
}

/** Public registration. Returns the created user only — no tokens. */
export function registerUpstream(payload: RegisterPayload): Promise<UpstreamResult<AuthUser>> {
  return upstreamJson<AuthUser>("/user", jsonRequest("POST", payload));
}

/** Rotates the pair: the presented refresh token is revoked by the API. */
export function refreshUpstream(
  refreshToken: string,
): Promise<UpstreamResult<UpstreamAuthResponse>> {
  return upstreamJson<UpstreamAuthResponse>("/auth/refresh", {
    method: "POST",
    headers: bearer(refreshToken),
  });
}

export function meUpstream(accessToken: string): Promise<UpstreamResult<AuthUser>> {
  return upstreamJson<AuthUser>("/auth/me", { headers: bearer(accessToken) });
}

/** Best-effort revoke. Logout must clear cookies even when the API is down. */
export async function logoutUpstream(refreshToken: string): Promise<void> {
  await upstreamJson<null>("/auth/logout", { method: "POST", headers: bearer(refreshToken) });
}
