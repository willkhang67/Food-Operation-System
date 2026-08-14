import { ApiErrorCode, type ApiErrorResponse, type CsrfTokenResponse } from "@/types";

/**
 * Every browser call goes to this app's own origin. There is no API host in
 * client code and no token in client code — the BFF holds both.
 */
const API_BASE_PATH = "/api";

const HTTP_NO_CONTENT = 204;

/** Mirrors src/server/http/csrf.ts. Only unsafe methods carry the header. */
const CSRF_COOKIE = "jj_csrf";
const CSRF_HEADER = "X-CSRF-Token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

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

function csrfBootstrapFailure(status: number): ApiError {
  return new ApiError({
    status,
    code: ApiErrorCode.CsrfRejected,
    message: "Could not verify this request. Please reload the page and try again.",
  });
}

/**
 * The CSRF cookie is readable on purpose — copying it into a header is what
 * proves the request came from a page on this origin rather than from someone
 * else's site, which can send the cookie but can never read it.
 */
function readCsrfCookie(): string | undefined {
  const prefix = `${CSRF_COOKIE}=`;

  for (const entry of document.cookie.split(";")) {
    const trimmed = entry.trimStart();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return undefined;
}

async function requestCsrfToken(): Promise<string> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_PATH}/auth/csrf`, { credentials: "same-origin" });
  } catch {
    throw csrfBootstrapFailure(0);
  }

  if (!response.ok) throw csrfBootstrapFailure(response.status);

  const payload = (await readJson(response)) as CsrfTokenResponse | null;

  if (!payload?.csrfToken) throw csrfBootstrapFailure(response.status);

  return payload.csrfToken;
}

/** Shared so a burst of parallel mutations bootstraps the token only once. */
let csrfBootstrap: Promise<string> | null = null;

function bootstrapCsrfToken(): Promise<string> {
  if (!csrfBootstrap) {
    csrfBootstrap = requestCsrfToken().finally(() => {
      csrfBootstrap = null;
    });
  }

  return csrfBootstrap;
}

async function csrfTokenFor(method: string, forceBootstrap: boolean): Promise<string | undefined> {
  if (SAFE_METHODS.has(method)) return undefined;

  if (!forceBootstrap) {
    const fromCookie = readCsrfCookie();
    if (fromCookie) return fromCookie;
  }

  return bootstrapCsrfToken();
}

async function sendRequest<T>(
  path: string,
  options: RequestOptions,
  isRetry: boolean,
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error(
      `apiFetch("${path}") was called during server rendering. This client uses ` +
        "relative URLs, which only resolve in the browser. Server Components should " +
        "call the API through src/server/http/upstream instead.",
    );
  }

  const { method = "GET", body, signal } = options;
  const hasBody = body !== undefined;

  const headers = new Headers();
  if (hasBody) headers.set("Content-Type", "application/json");

  const csrfToken = await csrfTokenFor(method, isRetry);
  if (csrfToken) headers.set(CSRF_HEADER, csrfToken);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      method,
      signal,
      // Session cookies are same-origin and httpOnly; the BFF turns them into
      // the bearer token the API expects.
      credentials: "same-origin",
      headers,
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
    const error = await toApiError(response);

    // The token goes stale when another tab signs in or out, or when the cookie
    // ages out mid-session. Replaying is safe: a request stopped at the CSRF
    // gate never reached the API, so nothing has happened yet.
    if (!isRetry && error.code === ApiErrorCode.CsrfRejected) {
      return sendRequest<T>(path, options, true);
    }

    throw error;
  }

  if (response.status === HTTP_NO_CONTENT) {
    return undefined as T;
  }

  return (await readJson(response)) as T;
}

export function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return sendRequest<T>(path, options, false);
}
