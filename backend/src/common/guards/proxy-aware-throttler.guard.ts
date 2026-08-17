import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';

/**
 * Rate limits by the *visitor's* IP rather than the proxy's.
 *
 * Every browser request reaches this API through the Next.js BFF, so the socket
 * address is the BFF's, identical for the whole user base. Left alone, the
 * limiter would treat all customers as one client — five login attempts a
 * minute across the entire shop.
 *
 * The obvious fix, trusting `x-forwarded-for`, would be worse than the problem.
 * This API has a public URL, so anyone can skip the BFF and send whatever
 * forwarding header they like; trusting it unconditionally turns the limiter
 * into a formality, since a fresh spoofed IP per attempt buys unlimited tries.
 * Express's `trust proxy` does not help either: it decides trust by counting
 * network hops, and a direct attacker controls their own hop.
 *
 * So trust is established by a shared secret that only the BFF knows, not by
 * network position. Two consequences worth keeping:
 *
 *  - It fails *closed*. No secret, wrong secret, or no header means we fall
 *    back to the socket address, which is more restrictive, never less.
 *  - The trust is scoped to this tracker alone. Express's global `trust proxy`
 *    stays off, so a forged header cannot reach request logging or anything
 *    else that reads `req.ip`.
 */

/** Set by the BFF. See frontend/src/server/http/upstream.ts. */
const PROXY_SECRET_HEADER = 'x-internal-proxy-secret';

/**
 * A single address the BFF resolved, rather than an `x-forwarded-for` chain.
 * One value means there is no "which hop do we believe" question to get wrong.
 */
const CLIENT_IP_HEADER = 'x-client-ip';

type IncomingHeaders = Record<string, string | string[] | undefined>;

function readHeader(
  headers: IncomingHeaders,
  name: string,
): string | undefined {
  const raw = headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

/** Constant-time so a wrong secret does not leak how much of it was right. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = (req.headers ?? {}) as IncomingHeaders;
    const socketAddress = typeof req.ip === 'string' ? req.ip : 'unknown';

    return Promise.resolve(this.reportedClientIp(headers) ?? socketAddress);
  }

  private reportedClientIp(headers: IncomingHeaders): string | undefined {
    const expected = process.env.INTERNAL_PROXY_SECRET;
    if (!expected) return undefined;

    const provided = readHeader(headers, PROXY_SECRET_HEADER);
    if (!provided || !secretMatches(provided, expected)) return undefined;

    return readHeader(headers, CLIENT_IP_HEADER);
  }
}
