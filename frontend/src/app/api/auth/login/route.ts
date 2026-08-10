import { loginUpstream } from "@/server/auth/auth-api";
import { establishSession } from "@/server/auth/session";
import { readJsonBody, readString } from "@/server/http/request";
import { ErrorCode, errorResponse, jsonResponse, upstreamErrorResponse } from "@/server/http/responses";
import type { SessionResponse } from "@/types";

export async function POST(request: Request): Promise<Response> {
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

  return jsonResponse<SessionResponse>({ user });
}
