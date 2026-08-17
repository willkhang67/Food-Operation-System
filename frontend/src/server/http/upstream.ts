import "server-only";

import { headers } from "next/headers";
import { getApiUrl, getInternalProxySecret, getUpstreamTimeoutMs } from "../env";

/** Synthetic status for "the request never reached the API" (DNS, timeout, cold start). */
export const NETWORK_ERROR_STATUS = 0;

export type UpstreamResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; payload: unknown };

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function jsonRequest(method: string, body: unknown, headers: HeadersInit = {}): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  };
}

export async function parseJsonBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** The platform in front of this app sets these; a browser cannot. */
function clientIp(incoming: Headers): string | undefined {
  const forwardedFor = incoming.get("x-forwarded-for");

  // Leftmost entry is the original caller; the rest are the hops after it.
  const first = forwardedFor?.split(",")[0]?.trim();
  if (first) return first;

  return incoming.get("x-real-ip")?.trim() || undefined;
}

/**
 * Headers the API needs about the *caller* rather than about this request's
 * payload. Added here so both entry points get them: the explicit auth routes,
 * where per-visitor login throttling matters most, and the catch-all proxy.
 *
 * The secret rides along only when there is an IP to vouch for, which keeps it
 * off requests that would gain nothing from it.
 */
async function callerHeaders(): Promise<Record<string, string>> {
  const attached: Record<string, string> = {};

  let incoming: Headers;
  try {
    incoming = await headers();
  } catch {
    // No request scope — a build-time prerender, for instance. Nothing to say.
    return attached;
  }

  const forwardedFor = incoming.get("x-forwarded-for");
  if (forwardedFor) attached["x-forwarded-for"] = forwardedFor;

  const ip = clientIp(incoming);
  const secret = getInternalProxySecret();

  if (ip && secret) {
    attached["x-client-ip"] = ip;
    attached["x-internal-proxy-secret"] = secret;
  }

  return attached;
}

/**
 * Lowest-level BFF -> API call. Returns `null` instead of throwing when the
 * request never completes, so every caller has to handle "API unreachable"
 * explicitly rather than leaking a 500 to the browser.
 */
export async function upstreamFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  const outgoing = new Headers(init.headers);

  // Applied last so a caller cannot present its own idea of who the client is.
  for (const [name, value] of Object.entries(await callerHeaders())) {
    outgoing.set(name, value);
  }

  try {
    return await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers: outgoing,
      cache: "no-store",
      signal: AbortSignal.timeout(getUpstreamTimeoutMs()),
    });
  } catch (error) {
    console.error(`[bff] upstream request failed: ${init.method ?? "GET"} ${path}`, error);
    return null;
  }
}

/** JSON-shaped wrapper used by the explicit auth routes. */
export async function upstreamJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<UpstreamResult<T>> {
  const response = await upstreamFetch(path, init);

  if (!response) {
    return { ok: false, status: NETWORK_ERROR_STATUS, payload: null };
  }

  const payload = await parseJsonBody(response);

  return response.ok
    ? { ok: true, status: response.status, data: payload as T }
    : { ok: false, status: response.status, payload };
}
