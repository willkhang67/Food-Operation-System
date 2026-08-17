import "server-only";

const DEFAULT_UPSTREAM_TIMEOUT_MS = 20_000;

export const isProduction = process.env.NODE_ENV === "production";

/**
 * Base URL of the Nest API. Server-only on purpose: the browser talks to the
 * BFF routes under /api, never to the API host directly.
 */
export function getApiUrl(): string {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error(
      "API_URL is not set. Copy .env.example to .env.local and point it at the Nest API.",
    );
  }

  return apiUrl.replace(/\/+$/, "");
}

export function getUpstreamTimeoutMs(): number {
  const parsed = Number(process.env.API_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_UPSTREAM_TIMEOUT_MS;
}

const MIN_CSRF_SECRET_LENGTH = 32;
const DEV_CSRF_SECRET = "development-only-csrf-secret-do-not-use-in-production";

/**
 * Signing key for CSRF tokens. Missing or weak in production is a hard failure
 * rather than a silent downgrade: a guessable key makes the token worthless.
 */
export function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET;

  if (!isProduction) {
    return secret && secret.length > 0 ? secret : DEV_CSRF_SECRET;
  }

  if (!secret || secret.length < MIN_CSRF_SECRET_LENGTH) {
    throw new Error(
      `CSRF_SECRET must be at least ${MIN_CSRF_SECRET_LENGTH} characters in production. ` +
        "Generate one with: openssl rand -base64 32",
    );
  }

  return secret;
}

const MIN_PROXY_SECRET_LENGTH = 32;

/**
 * Shared secret that lets the API believe the client IP this proxy reports, so
 * rate limiting is per visitor instead of per BFF instance.
 *
 * Absence is tolerated — the API then buckets by socket address, which is more
 * restrictive, not less. A *weak* value is not tolerated in production, because
 * a guessable secret lets anyone spoof their IP and sidesteps the limiter
 * entirely, which is worse than not having the mechanism at all.
 */
export function getInternalProxySecret(): string | undefined {
  const secret = process.env.INTERNAL_PROXY_SECRET;

  if (!secret) return undefined;

  if (isProduction && secret.length < MIN_PROXY_SECRET_LENGTH) {
    throw new Error(
      `INTERNAL_PROXY_SECRET must be at least ${MIN_PROXY_SECRET_LENGTH} characters in ` +
        "production, or left unset. Generate one with: openssl rand -base64 32",
    );
  }

  return secret;
}
