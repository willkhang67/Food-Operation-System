import "server-only";

import type { AuthUser } from "@/types";
import { NETWORK_ERROR_STATUS, type UpstreamResult } from "../http/upstream";
import { bffLogger } from "../logging/logger";
import {
  logoutUpstream,
  meUpstream,
  refreshUpstream,
  type UpstreamAuthResponse,
} from "./auth-api";
import {
  clearSessionCookies,
  readAccessToken,
  readRefreshToken,
  writeSessionCookies,
} from "./cookies";

export type SessionOutcome =
  | { status: "authenticated"; user: AuthUser }
  | { status: "anonymous" }
  /** The API could not be reached — different from "signed out", so the UI can retry. */
  | { status: "unavailable" };

/** Internal variant that keeps the tokens; only `auth.user` may be sent to the browser. */
type RotationOutcome =
  | { status: "authenticated"; auth: UpstreamAuthResponse }
  | { status: "anonymous" }
  | { status: "unavailable" };

export async function establishSession(auth: UpstreamAuthResponse): Promise<AuthUser> {
  await writeSessionCookies(auth);
  return auth.user;
}

/** Revokes the refresh token upstream when possible, and always clears cookies. */
export async function destroySession(): Promise<void> {
  const refreshToken = await readRefreshToken();

  if (refreshToken) {
    await logoutUpstream(refreshToken);
  }

  await clearSessionCookies();
}

function isTransportFailure(status: number): boolean {
  return status === NETWORK_ERROR_STATUS || status >= 500;
}

/**
 * Rotations currently in flight, keyed by the token being redeemed.
 *
 * The API revokes a refresh token the instant it is redeemed and treats a
 * second presentation as theft, revoking the whole family. Concurrent requests
 * that each try to redeem the same cookie would therefore destroy a perfectly
 * valid session, so they share one redemption instead.
 */
const rotationsInFlight = new Map<string, Promise<UpstreamResult<UpstreamAuthResponse>>>();

function redeemRefreshToken(
  refreshToken: string,
): Promise<UpstreamResult<UpstreamAuthResponse>> {
  const existing = rotationsInFlight.get(refreshToken);
  if (existing) return existing;

  const pending = refreshUpstream(refreshToken).finally(() => {
    rotationsInFlight.delete(refreshToken);
  });

  rotationsInFlight.set(refreshToken, pending);
  return pending;
}

async function rotateTokens(): Promise<RotationOutcome> {
  const refreshToken = await readRefreshToken();

  // Absent is not the same as rejected. The refresh cookie is path-scoped, so a
  // caller outside /api simply cannot see it — tearing the session down here
  // would sign users out from contexts that were never able to rotate.
  if (!refreshToken) {
    return { status: "anonymous" };
  }

  // Every caller writes the resulting pair to its own response, so sharing the
  // redemption is safe: they all end up with the same cookies.
  const result = await redeemRefreshToken(refreshToken);

  if (result.ok) {
    await writeSessionCookies(result.data);
    return { status: "authenticated", auth: result.data };
  }

  // A cold-starting or failing API must not sign users out.
  if (isTransportFailure(result.status)) {
    bffLogger.warn("session refresh unavailable", { status: result.status });
    return { status: "unavailable" };
  }

  // The only case where the session is really over: the API rejected the
  // refresh token as expired, revoked, or replayed.
  bffLogger.info("session cleared after refresh rejection", { status: result.status });
  await clearSessionCookies();
  return { status: "anonymous" };
}

export async function refreshSession(): Promise<SessionOutcome> {
  const outcome = await rotateTokens();

  return outcome.status === "authenticated"
    ? { status: "authenticated", user: outcome.auth.user }
    : outcome;
}

/**
 * Who the current request belongs to. Falls back to one rotation when the
 * access token is missing or rejected, which is what makes a page reload after
 * the short access-token window still resolve to a signed-in user.
 */
export async function resolveSession(): Promise<SessionOutcome> {
  const accessToken = await readAccessToken();

  if (accessToken) {
    const result = await meUpstream(accessToken);

    if (result.ok) {
      return { status: "authenticated", user: result.data };
    }

    if (isTransportFailure(result.status)) {
      return { status: "unavailable" };
    }

    if (result.status !== 401) {
      return { status: "anonymous" };
    }
  }

  return refreshSession();
}

/**
 * Forces a rotation and returns the new access token. Used when the API rejects
 * the token the BFF was holding.
 */
export async function rotateAccessToken(): Promise<string | undefined> {
  const outcome = await rotateTokens();
  return outcome.status === "authenticated" ? outcome.auth.accessToken : undefined;
}
