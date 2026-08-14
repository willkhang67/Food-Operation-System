import { resolveSession } from "@/server/auth/session";
import { ErrorCode, errorResponse, jsonResponse } from "@/server/http/responses";
import type { SessionResponse } from "@/types";

export async function GET(): Promise<Response> {
  const outcome = await resolveSession();

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
      return errorResponse(401, ErrorCode.Unauthenticated, "Not signed in.");
  }
}
