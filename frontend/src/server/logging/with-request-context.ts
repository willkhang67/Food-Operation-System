import "server-only";

import {
  attachRequestIdHeader,
  resolveRequestId,
  runWithRequestId,
} from "./request-id";

type RouteHandler<R extends Request, Rest extends unknown[]> = (
  request: R,
  ...rest: Rest
) => Promise<Response>;

/**
 * Establishes request-scoped correlation for every BFF entry point.
 * Compose outside CSRF so rejections still carry and log the same id:
 *
 *   export const POST = withRequestContext(withCsrfProtection(handler));
 */
export function withRequestContext<R extends Request, Rest extends unknown[]>(
  handler: RouteHandler<R, Rest>,
): RouteHandler<R, Rest> {
  return async (request, ...rest) => {
    const requestId = resolveRequestId(request);

    return runWithRequestId(requestId, async () => {
      const response = await handler(request, ...rest);
      return attachRequestIdHeader(response, requestId);
    });
  };
}
