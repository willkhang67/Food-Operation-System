import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getCsrfSecret, isProduction } from "../env";
import { ErrorCode, errorResponse } from "./responses";

/**
 * Cross-site request forgery protection for the BFF.
 *
 * Session cookies are `SameSite=Lax`, which already blocks the classic attack:
 * a cross-site form POST carries no cookies. Two gaps remain, and this module
 * closes both.
 *
 *  1. `Lax` is enforced by the browser, not by us. Older browsers, an embedded
 *     webview, or a future need to relax the attribute would silently remove
 *     the only defence.
 *  2. `Lax` still allows top-level GET navigations to send cookies, so any
 *     route that mutates on GET would be exposed. We never do that, but the
 *     check below makes the rule explicit rather than assumed.
 *
 * Two independent layers, as OWASP recommends:
 *
 *  - **Origin check.** Browsers attach `Origin` to every non-GET fetch, and a
 *    cross-site page cannot forge it. This is the strongest single signal.
 *  - **Signed double-submit token.** A random value is stored in a readable
 *    cookie and must be echoed in a header. A cross-site page can cause the
 *    cookie to be sent but cannot read it, so it cannot produce the header.
 *    The value is HMAC-signed so only tokens this app issued are accepted.
 *
 * The token is not a credential — it grants nothing on its own and is useless
 * without the session cookies, which stay httpOnly.
 */

export const CSRF_COOKIE = "jj_csrf";
export const CSRF_HEADER = "x-csrf-token";

const CSRF_PATH = "/";
/** Long enough to outlive a shopping session, short enough to age out. */
const CSRF_MAX_AGE = 12 * 60 * 60;
const TOKEN_BYTES = 32;

/** Methods that must never mutate, and so need no token. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function cookieAttributes(maxAge: number) {
  return {
    // Deliberately readable: the browser has to copy this value into the
    // request header. That is the whole mechanism.
    httpOnly: false,
    sameSite: "lax" as const,
    secure: isProduction,
    path: CSRF_PATH,
    maxAge,
  };
}

function sign(value: string): string {
  return createHmac("sha256", getCsrfSecret()).update(value).digest("base64url");
}

function mintToken(): string {
  const value = randomBytes(TOKEN_BYTES).toString("hex");
  return `${value}.${sign(value)}`;
}

/** Constant-time compare. Length is allowed to leak; the secret part is not. */
function equals(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verifies the signature, which proves the token came from this app rather than
 * from an attacker who managed to plant a cookie on the domain.
 */
function isIssuedByUs(token: string): boolean {
  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) return false;

  return equals(token.slice(separator + 1), sign(token.slice(0, separator)));
}

async function readCsrfCookie(): Promise<string | undefined> {
  return (await cookies()).get(CSRF_COOKIE)?.value;
}

/** Issues a fresh token. Called whenever the session identity changes. */
export async function rotateCsrfToken(): Promise<string> {
  const token = mintToken();
  (await cookies()).set(CSRF_COOKIE, token, cookieAttributes(CSRF_MAX_AGE));
  return token;
}

/**
 * The current token, minting one when the cookie is absent or not ours.
 * Reusing a still-valid token keeps other tabs working.
 */
export async function ensureCsrfToken(): Promise<string> {
  const existing = await readCsrfCookie();
  return existing && isIssuedByUs(existing) ? existing : rotateCsrfToken();
}

/**
 * The host this request was actually addressed to. `x-forwarded-host` is set by
 * the platform in front of us; a browser cannot set it from a cross-site page
 * because it is not a CORS-safelisted header, so trusting it here is safe.
 */
function requestHost(request: Request): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

function isSameOrigin(request: Request): boolean {
  const host = requestHost(request);
  if (!host) return false;

  // `Referer` is the fallback for the rare client that omits `Origin`.
  const declared = request.headers.get("origin") ?? request.headers.get("referer");
  if (!declared) return false;

  try {
    return new URL(declared).host === host;
  } catch {
    return false;
  }
}

/** One message for every rejection: the reason is a server-side detail. */
const REJECTION_MESSAGE = "This request could not be verified. Please reload the page and try again.";

function reject(request: Request, reason: string): Response {
  console.warn(`[csrf] rejected ${request.method} ${new URL(request.url).pathname}: ${reason}`);
  return errorResponse(403, ErrorCode.CsrfRejected, REJECTION_MESSAGE);
}

/** Returns a 403 response when the request fails a check, or null to continue. */
export async function verifyCsrf(request: Request): Promise<Response | null> {
  if (SAFE_METHODS.has(request.method)) return null;

  if (!isSameOrigin(request)) {
    return reject(request, "origin does not match this host");
  }

  const header = request.headers.get(CSRF_HEADER);
  if (!header) return reject(request, `missing ${CSRF_HEADER} header`);

  const cookie = await readCsrfCookie();
  if (!cookie) return reject(request, `missing ${CSRF_COOKIE} cookie`);

  if (!equals(header, cookie)) return reject(request, "header does not match cookie");
  if (!isIssuedByUs(cookie)) return reject(request, "token signature is invalid");

  return null;
}

type RouteHandler<R extends Request, Rest extends unknown[]> = (
  request: R,
  ...rest: Rest
) => Promise<Response>;

/**
 * Wraps a route handler so unsafe methods are checked before it runs. Applied
 * at the export site so every mutating entry point declares its protection in
 * one visible place.
 */
export function withCsrfProtection<R extends Request, Rest extends unknown[]>(
  handler: RouteHandler<R, Rest>,
): RouteHandler<R, Rest> {
  return async (request, ...rest) => (await verifyCsrf(request)) ?? handler(request, ...rest);
}
