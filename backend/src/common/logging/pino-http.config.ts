import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Options } from 'pino-http';
import { isValidRequestId, REQUEST_ID_HEADER } from './request-id';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function resolveLogLevel(): string {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (configured) return configured;
  return isProduction() ? 'info' : 'debug';
}

/**
 * Paths that must never appear in logs, even if a future handler dumps req/res.
 * Censoring is enforced by pino — do not rely on callers remembering to omit them.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-internal-proxy-secret"]',
  'req.headers["x-csrf-token"]',
  'req.headers["stripe-signature"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.refreshToken',
  'req.body.accessToken',
  'req.body.token',
];

function shouldIgnoreRequest(req: IncomingMessage): boolean {
  const url = req.url ?? '';
  // Platform probes and the leftover root hello — noise, not signal.
  return url === '/health' || url.startsWith('/health?') || url === '/' || url.startsWith('/?');
}

/**
 * pino-http options for nestjs-pino. Production emits JSON (log drains);
 * local/dev uses pino-pretty so humans can read the stream.
 */
export function createPinoHttpOptions(): Options {
  const level = resolveLogLevel();

  return {
    level,
    genReqId: (req, res) => {
      const incoming = req.headers[REQUEST_ID_HEADER];
      const fromHeader = Array.isArray(incoming) ? incoming[0] : incoming;
      const id = isValidRequestId(fromHeader) ? fromHeader : randomUUID();

      // Echo so the BFF (and operators) can join Nest lines to the edge request.
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    customProps: (req) => ({
      requestId: req.id,
    }),
    redact: {
      paths: REDACT_PATHS,
      censor: '[Redacted]',
    },
    autoLogging: {
      ignore: shouldIgnoreRequest,
    },
    // Keep access logs lean: method, url, status, duration — not full bodies.
    serializers: {
      req: (req: IncomingMessage & { id?: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res: ServerResponse) => ({
        statusCode: res.statusCode,
      }),
    },
    transport: isProduction()
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
  };
}
