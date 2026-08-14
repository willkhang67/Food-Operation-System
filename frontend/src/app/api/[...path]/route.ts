import type { NextRequest } from "next/server";
import { withCsrfProtection } from "@/server/http/csrf";
import { proxyToApi } from "@/server/http/proxy";

/** Explicit routes such as /api/auth/login take precedence over this catch-all. */
interface ProxyContext {
  params: Promise<{ path: string[] }>;
}

async function handle(request: NextRequest, context: ProxyContext): Promise<Response> {
  const { path } = await context.params;
  return proxyToApi(request, path);
}

/**
 * Every method goes through the same guard; it is a no-op for reads. That way a
 * new mutating endpoint on the API is protected the moment it exists, instead
 * of waiting for someone to remember to add it to a list here.
 */
const guarded = withCsrfProtection(handle);

export const GET = guarded;
export const HEAD = guarded;
export const POST = guarded;
export const PUT = guarded;
export const PATCH = guarded;
export const DELETE = guarded;
