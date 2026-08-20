import { destroySession } from "@/server/auth/session";
import { rotateCsrfToken, withCsrfProtection } from "@/server/http/csrf";
import { noContentResponse } from "@/server/http/responses";
import { withRequestContext } from "@/server/logging/with-request-context";

/**
 * Idempotent: always clears cookies, even if the API cannot be reached.
 *
 * CSRF-protected so a cross-site page cannot sign the visitor out — a nuisance
 * attack, but one that costs nothing to close.
 */
export const POST = withRequestContext(
  withCsrfProtection(async (): Promise<Response> => {
    await destroySession();

    // Rotate rather than clear, so the next sign-in does not need a round trip to
    // fetch a token first.
    await rotateCsrfToken();

    return noContentResponse();
  }),
);
