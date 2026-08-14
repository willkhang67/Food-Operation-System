import "server-only";

import { getApiUrl, getUpstreamTimeoutMs } from "../env";

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

/**
 * Lowest-level BFF -> API call. Returns `null` instead of throwing when the
 * request never completes, so every caller has to handle "API unreachable"
 * explicitly rather than leaking a 500 to the browser.
 */
export async function upstreamFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  try {
    return await fetch(`${getApiUrl()}${path}`, {
      ...init,
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
