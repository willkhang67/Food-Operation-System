import { loginUpstream } from "@/server/auth/auth-api";
import { establishSession } from "@/server/auth/session";
import { rotateCsrfToken, withCsrfProtection } from "@/server/http/csrf";
import { readJsonBody, readString } from "@/server/http/request";
import {
  ErrorCode,
  errorResponse,
  jsonResponse,
  upstreamErrorResponse,
} from "@/server/http/responses";
import { withRequestContext } from "@/server/logging/with-request-context";
import type { SessionResponse } from "@/types";

/**
 * CSRF-protected even though it starts a session: without it, a cross-site page
 * could sign a visitor into an account the attacker controls, and any card they
 * then save would belong to the attacker.
 */
export const POST = withRequestContext(
  withCsrfProtection(async (request: Request): Promise<Response> => {
    const body = await readJsonBody(request);

    if (!body) {
      return errorResponse(400, ErrorCode.ValidationError, "Request body must be a JSON object.");
    }

    const email = readString(body, "email");
    // Read raw: trimming a password would silently change the credential.
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return errorResponse(400, ErrorCode.ValidationError, "Email and password are required.");
    }

    const result = await loginUpstream({ email, password });

    if (!result.ok) {
      return upstreamErrorResponse(result.status, result.payload, {
        unauthorizedCode: ErrorCode.InvalidCredentials,
      });
    }

    const user = await establishSession(result.data);

    // New session, new token: a value that was observable before sign-in must not
    // stay valid for requests made as the signed-in user.
    await rotateCsrfToken();

    return jsonResponse<SessionResponse>({ user });
  }),
);
