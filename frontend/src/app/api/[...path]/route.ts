import type { NextRequest } from "next/server";
import { proxyToApi } from "@/server/http/proxy";

/** Explicit routes such as /api/auth/login take precedence over this catch-all. */
interface ProxyContext {
  params: Promise<{ path: string[] }>;
}

async function handle(request: NextRequest, context: ProxyContext): Promise<Response> {
  const { path } = await context.params;
  return proxyToApi(request, path);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
