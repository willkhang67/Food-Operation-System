import { refreshSession } from "@/server/auth/session";
import { ErrorCode, errorResponse, jsonResponse } from "@/server/http/responses";
import type { SessionResponse } from "@/types";

export async function POST(): Promise<Response> {
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
}
