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
