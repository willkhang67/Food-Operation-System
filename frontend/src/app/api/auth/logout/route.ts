import { destroySession } from "@/server/auth/session";
import { noContentResponse } from "@/server/http/responses";

/** Idempotent: always clears cookies, even if the API cannot be reached. */
export async function POST(): Promise<Response> {
  await destroySession();
  return noContentResponse();
}
