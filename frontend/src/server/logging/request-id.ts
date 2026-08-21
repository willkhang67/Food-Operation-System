import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Shared with the Nest API. One value per browser request lets operators join
 * Vercel BFF lines to Railway/Render Nest lines with a single grep.
 */
export const REQUEST_ID_HEADER = "x-request-id";

/** Reject values that could break log lines or be used for header injection. */
const REQUEST_ID_PATTERN = /^[\w-]{8,128}$/;

const store = new AsyncLocalStorage<string>();

export function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function getRequestId(): string | undefined {
  return store.getStore();
}

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return store.run(requestId, fn);
}

/**
 * Prefer a client/platform-supplied id when it is well-formed; otherwise mint one.
 * Platforms (Vercel) sometimes set this; browsers generally do not.
 */
export function resolveRequestId(request: Request): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  if (isValidRequestId(incoming)) return incoming;
  return randomUUID();
}

export function attachRequestIdHeader(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
