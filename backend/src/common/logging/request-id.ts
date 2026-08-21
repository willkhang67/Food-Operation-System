/**
 * Shared request-correlation header between the Next BFF and this API.
 * The BFF mints (or forwards) the value; we reuse it so one grep spans both hosts.
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Reject values that could break log lines or be used for header injection. */
const REQUEST_ID_PATTERN = /^[\w-]{8,128}$/;

export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

export function readRequestIdHeader(
  headers: Record<string, unknown> | undefined,
): string | undefined {
  if (!headers) return undefined;

  const raw = headers[REQUEST_ID_HEADER] ?? headers['X-Request-Id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;

  return isValidRequestId(candidate) ? candidate : undefined;
}
