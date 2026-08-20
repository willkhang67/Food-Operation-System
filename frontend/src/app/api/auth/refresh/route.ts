import { refreshSession } from "@/server/auth/session";
import { withCsrfProtection } from "@/server/http/csrf";
import { ErrorCode, errorResponse, jsonResponse } from "@/server/http/responses";
import { withRequestContext } from "@/server/logging/with-request-context";
import type { SessionResponse } from "@/types";

/**
 * CSRF-protected: rotation revokes the presented refresh token, so an
 * unprotected version would let a cross-site page burn a visitor's session.
 * The token is not rotated here — the session identity has not changed.
 */
export const POST = withRequestContext(
  withCsrfProtection(async (): Promise<Response> => {
    const outcome = await refreshSession();

    switch (outcome.status) {
      case "authenticated":
        return jsonResponse<SessionResponse>({ user: outcome.user });
      case "unavailable":
        return errorResponse(
          503,
          ErrorCode.UpstreamUnavailable,
          "Cannot reach the server right now. Please try again.",
        );
      default:
        return errorResponse(
          401,
          ErrorCode.Unauthenticated,
          "Your session has expired. Please sign in again.",
        );
    }
  }),
);
