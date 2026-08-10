/**
 * The error vocabulary shared by both sides of the BFF: route handlers emit
 * these codes, the browser client branches on them. Keeping one definition
 * stops the two halves from drifting apart.
 */
export const ApiErrorCode = {
  ValidationError: "VALIDATION_ERROR",
  InvalidCredentials: "INVALID_CREDENTIALS",
  EmailTaken: "EMAIL_TAKEN",
  Unauthenticated: "UNAUTHENTICATED",
  Forbidden: "FORBIDDEN",
  NotFound: "NOT_FOUND",
  RateLimited: "RATE_LIMITED",
  UpstreamUnavailable: "UPSTREAM_UNAVAILABLE",
  Internal: "INTERNAL_ERROR",
  /** Client-side only: the request never left the browser. */
  NetworkError: "NETWORK_ERROR",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
