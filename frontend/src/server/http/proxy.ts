import "server-only";

import type { NextRequest } from "next/server";
import { readAccessToken } from "../auth/cookies";
import { rotateAccessToken } from "../auth/session";
import { ErrorCode, errorResponse, upstreamErrorResponse } from "./responses";
import { parseJsonBody, upstreamFetch } from "./upstream";

/**
 * Upstream prefixes the browser may never reach through the generic proxy.
 *
 * - `auth`: owned by the explicit routes in /api/auth. Proxying it would hand
 *   raw access and refresh tokens to JavaScript, which is the exact thing the
 *   BFF exists to prevent.
 * - `payment/webhook`: Stripe calls the API directly and the signature is
 *   computed over the raw body; there is no legitimate browser caller.
 *
 * Everything else is forwarded. The proxy grants no authority of its own — it
 * only attaches the caller's own token — so authorisation stays in Nest's
 * guards rather than being duplicated as an allow-list here.
 */
const BLOCKED_PREFIXES = ["auth", "payment/webhook"];

/**
 * Allow-list, not a deny-list: anything unlisted is dropped. Notably absent are
 * `cookie` (session cookies belong to this origin only) and `authorization`
 * (set from the session below, never from the caller).
 */
const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "accept-language"];

/**
 * Deliberately omits `content-length` and `content-encoding` — fetch has
 * already decoded the body, so forwarding them would describe it wrongly — and
 * `set-cookie`, since only the BFF writes cookies on this origin.
 */
const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "content-language"];

/** Bodies are buffered to make the 401 replay possible, so the size is capped. */
const MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024;

const BODILESS_METHODS = new Set(["GET", "HEAD"]);
const BODILESS_STATUSES = new Set([204, 304]);

function isBlocked(path: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function buildRequestHeaders(request: NextRequest, accessToken: string | undefined): Headers {
  const headers = new Headers();

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // The caller's IP is attached by upstreamFetch, which every BFF -> API call
  // goes through, so the auth routes get it too rather than only this proxy.

  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  return headers;
}

function buildResponseHeaders(response: Response): Headers {
  const headers = new Headers();

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Responses are shaped by the caller's token, so neither the browser nor any
  // shared cache in front of this app may store them.
  headers.set("cache-control", "no-store");

  return headers;
}

type BufferedBody = { ok: true; body: ArrayBuffer | null } | { ok: false };

async function readRequestBody(request: NextRequest): Promise<BufferedBody> {
  if (BODILESS_METHODS.has(request.method)) return { ok: true, body: null };

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    return { ok: false };
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_REQUEST_BODY_BYTES) return { ok: false };

  return { ok: true, body: body.byteLength > 0 ? body : null };
}

/**
 * Forwards a browser request to the Nest API with the session's access token
 * attached, so the token itself never leaves the server.
 */
export async function proxyToApi(request: NextRequest, segments: string[]): Promise<Response> {
  const path = segments.map(encodeURIComponent).join("/");

  if (isBlocked(path)) {
    return errorResponse(404, ErrorCode.NotFound, "Not found.");
  }

  const buffered = await readRequestBody(request);
  if (!buffered.ok) {
    return errorResponse(413, ErrorCode.ValidationError, "That upload is too large.");
  }

  const target = `/${path}${request.nextUrl.search}`;

  // Whatever token we already hold, without forcing a rotation. Rotating up
  // front would burn a refresh token on every public request too, and parallel
  // requests would then race to redeem the same one.
  const accessToken = await readAccessToken();

  const send = (token: string | undefined) =>
    upstreamFetch(target, {
      method: request.method,
      headers: buildRequestHeaders(request, token),
      body: buffered.body,
      // Never chase a redirect off the API host on the caller's behalf.
      redirect: "manual",
    });

  let response = await send(accessToken);

  // Only a genuine 401 proves this request needed a token we did not have, so
  // that is the one moment worth rotating. Replaying is safe even for POST: a
  // request refused with 401 never ran.
  if (response?.status === 401) {
    const rotated = await rotateAccessToken();
    if (rotated) response = await send(rotated);
  }

  if (!response) {
    return errorResponse(
      503,
      ErrorCode.UpstreamUnavailable,
      "Cannot reach the server right now. Please try again.",
    );
  }

  // Failures are normalised so the whole /api surface speaks one error shape.
  if (!response.ok) {
    return upstreamErrorResponse(response.status, await parseJsonBody(response));
  }

  const hasBody = !BODILESS_STATUSES.has(response.status) && request.method !== "HEAD";

  return new Response(hasBody ? response.body : null, {
    status: response.status,
    headers: buildResponseHeaders(response),
  });
}
