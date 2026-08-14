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
