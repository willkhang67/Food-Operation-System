import { loginUpstream, registerUpstream } from "@/server/auth/auth-api";
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
import type { RegisterResponse } from "@/types";

export const POST = withRequestContext(
  withCsrfProtection(async (request: Request): Promise<Response> => {
    const body = await readJsonBody(request);

    if (!body) {
      return errorResponse(400, ErrorCode.ValidationError, "Request body must be a JSON object.");
    }

    const name = readString(body, "name");
    const email = readString(body, "email");
    const phone = readString(body, "phone");
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return errorResponse(
        400,
        ErrorCode.ValidationError,
        "Name, email and password are required.",
      );
    }

    const created = await registerUpstream({
      name,
      email,
      password,
      ...(phone ? { phone } : {}),
    });

    if (!created.ok) {
      return upstreamErrorResponse(created.status, created.payload, {
        conflictCode: ErrorCode.EmailTaken,
      });
    }

    // Sign the new account in straight away. If that second call is rejected
    // (rate limiting, for example) the account still exists, so report success
    // without a session rather than failing the registration.
    const login = await loginUpstream({ email, password });

    if (!login.ok) {
      return jsonResponse<RegisterResponse>({ user: created.data, sessionStarted: false }, 201);
    }

    const user = await establishSession(login.data);

    await rotateCsrfToken();

    return jsonResponse<RegisterResponse>({ user, sessionStarted: true }, 201);
  }),
);
