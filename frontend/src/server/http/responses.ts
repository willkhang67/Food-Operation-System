import "server-only";

import { ApiErrorCode, type ApiErrorResponse } from "@/types";

/** Server-side alias for the shared vocabulary in @/types/api-error. */
export const ErrorCode = ApiErrorCode;
export type ErrorCode = ApiErrorCode;

/** Auth responses are per-session and must never be stored by a browser or CDN. */
const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export function jsonResponse<T>(body: T, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
}

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  details?: string[],
): Response {
  const body: ApiErrorResponse = details?.length ? { code, message, details } : { code, message };
  return jsonResponse(body, status);
}

/** Nest's exception shape. `message` is a string, or an array for validation errors. */
interface UpstreamErrorPayload {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

function readUpstreamMessage(payload: unknown): { message?: string; details?: string[] } {
  if (typeof payload !== "object" || payload === null) return {};

  const { message } = payload as UpstreamErrorPayload;

  if (Array.isArray(message)) {
    return { message: message[0], details: message };
  }

  return typeof message === "string" ? { message } : {};
}

interface UpstreamErrorOptions {
  /** Code a 401 from the API maps to in this context. */
  unauthorizedCode?: ErrorCode;
  /** Code a 409 from the API maps to in this context. */
  conflictCode?: ErrorCode;
}

/**
 * Translate an API failure into a stable client-facing error. Upstream text is
 * only forwarded for 4xx; 5xx and transport failures get a generic message so
 * server internals never reach the browser.
 */
export function upstreamErrorResponse(
  status: number,
  payload: unknown,
  options: UpstreamErrorOptions = {},
): Response {
  const { message, details } = readUpstreamMessage(payload);

  switch (status) {
    case 0:
      return errorResponse(
        503,
        ErrorCode.UpstreamUnavailable,
        "Cannot reach the server right now. Please try again.",
      );
    case 400:
      return errorResponse(
        400,
        ErrorCode.ValidationError,
        message ?? "Some fields are invalid.",
        details,
      );
    case 401:
      return errorResponse(
        401,
        options.unauthorizedCode ?? ErrorCode.Unauthenticated,
        message ?? "Not authenticated.",
      );
    case 403:
      return errorResponse(403, ErrorCode.Forbidden, "You do not have access to this resource.");
    case 404:
      return errorResponse(404, ErrorCode.NotFound, message ?? "Not found.");
    case 409:
      // Defaults to the generic code on purpose. The proxy forwards conflicts
      // from every resource, and reporting "already paid" as EMAIL_TAKEN would
      // make the client branch on a code that has nothing to do with the call.
      // Routes that know what a 409 means pass `conflictCode` explicitly.
      return errorResponse(
        409,
        options.conflictCode ?? ErrorCode.Conflict,
        message ?? "That request conflicts with the current state.",
      );
    case 429:
      return errorResponse(
        429,
        ErrorCode.RateLimited,
        "Too many attempts. Please wait a moment and try again.",
      );
    default:
      return errorResponse(502, ErrorCode.Internal, "Something went wrong. Please try again.");
  }
}
