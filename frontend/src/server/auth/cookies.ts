import "server-only";

import { cookies } from "next/headers";
import { isProduction } from "../env";
import type { TokenPair } from "./auth-api";

const ACCESS_COOKIE = "jj_access";
const REFRESH_COOKIE = "jj_refresh";

const ACCESS_PATH = "/";
/**
 * Scoped to the paths that are actually capable of rotating it: route handlers
 * are the only place Next.js allows a cookie to be written, so /api covers the
 * auth routes and the API proxy while keeping the long-lived token off document
 * and static-asset requests.
 */
const REFRESH_PATH = "/api";

const FALLBACK_ACCESS_MAX_AGE = 30 * 60;
const FALLBACK_REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

const DURATION_PATTERN = /^(\d+)\s*([smhd])$/i;
const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const;

/** Converts the API's "30m" / "7d" into seconds so cookie lifetime tracks token lifetime. */
function parseDurationSeconds(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const match = DURATION_PATTERN.exec(value.trim());
  if (match) {
    const unit = match[2].toLowerCase() as keyof typeof UNIT_SECONDS;
    return Number(match[1]) * UNIT_SECONDS[unit];
  }

  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : fallback;
}

function baseAttributes(path: string, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path,
    maxAge,
  };
}

export async function readAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function readRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

export async function writeSessionCookies(tokens: TokenPair): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(
    ACCESS_COOKIE,
    tokens.accessToken,
    baseAttributes(ACCESS_PATH, parseDurationSeconds(tokens.expiresIn, FALLBACK_ACCESS_MAX_AGE)),
  );

  cookieStore.set(
    REFRESH_COOKIE,
    tokens.refreshToken,
    baseAttributes(
      REFRESH_PATH,
      parseDurationSeconds(tokens.refreshExpiresIn, FALLBACK_REFRESH_MAX_AGE),
    ),
  );
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();

  // Expiring in place (rather than delete) guarantees the attributes match the
  // ones used to set them; a path mismatch would silently leave the cookie.
  cookieStore.set(ACCESS_COOKIE, "", baseAttributes(ACCESS_PATH, 0));
  cookieStore.set(REFRESH_COOKIE, "", baseAttributes(REFRESH_PATH, 0));
}
