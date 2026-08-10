import { ApiErrorCode, type ApiErrorResponse } from "@/types";

/**
 * Every browser call goes to this app's own origin. There is no API host in
 * client code and no token in client code — the BFF holds both.
 */
const API_BASE_PATH = "/api";

const HTTP_NO_CONTENT = 204;

interface ApiErrorInit {
  status: number;
  code: string;
  message: string;
  details?: string[];
}

export class ApiError extends Error {
  readonly status: number;
  /** A value from ApiErrorCode. Branch on this, never on the message. */
  readonly code: string;
  readonly details?: string[];

  constructor({ status, code, message, details }: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Aborts are a normal part of cleanup, so callers need to tell them apart. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

/** Options for reads, which never carry a body. */
export type QueryOptions = Pick<RequestOptions, "signal">;

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  if (typeof payload !== "object" || payload === null) return false;
  const { code, message } = payload as Partial<ApiErrorResponse>;
  return typeof code === "string" && typeof message === "string";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const payload = await readJson(response);

  if (isApiErrorResponse(payload)) {
    return new ApiError({
      status: response.status,
      code: payload.code,
      message: payload.message,
      details: payload.details,
    });
  }

  // Not our error shape: a crashed route handler or a platform error page.
  return new ApiError({
    status: response.status,
    code: ApiErrorCode.Internal,
    message: "Something went wrong. Please try again.",
  });
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error(
      `apiFetch("${path}") was called during server rendering. This client uses ` +
        "relative URLs, which only resolve in the browser. Server Components should " +
        "call the API through src/server/http/upstream instead.",
    );
  }

  const { method = "GET", body, signal } = options;
  const hasBody = body !== undefined;

  let response: Response;

  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      method,
      signal,
      // Session cookies are same-origin and httpOnly; the BFF turns them into
      // the bearer token the API expects.
      credentials: "same-origin",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;

    throw new ApiError({
      status: 0,
      code: ApiErrorCode.NetworkError,
      message: "No connection. Check your network and try again.",
    });
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === HTTP_NO_CONTENT) {
    return undefined as T;
  }

  const payload = await readJson(response);

  return payload as T;
}
