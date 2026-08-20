import { ensureCsrfToken } from "@/server/http/csrf";
import { jsonResponse } from "@/server/http/responses";
import { withRequestContext } from "@/server/logging/with-request-context";
import type { CsrfTokenResponse } from "@/types";

/**
 * Bootstraps the CSRF token for a browser that does not have one yet — a first
 * visit, or one where the cookie has aged out. Safe to call at any time: it
 * reuses a valid token rather than rotating, so open tabs keep working.
 */
export const GET = withRequestContext(async (): Promise<Response> => {
  const csrfToken = await ensureCsrfToken();
  return jsonResponse<CsrfTokenResponse>({ csrfToken });
});
