# Logging

How this monorepo logs, what must never appear in logs, and how to operate
production. Read alongside `auth-bff.md` before changing BFF or Nest entry points.

## Shape

```
browser ──/api/*──▶ Next BFF (Vercel) ──x-request-id──▶ Nest API (Railway/Render)
                         │                                    │
                         └── structured JSON / stdout ─────────┘
```

| Layer | Implementation | What to log |
| ----- | -------------- | ----------- |
| Nest API | `nestjs-pino` + Nest `Logger` in services | Access lines, auth events, orders, Stripe webhooks |
| Next BFF | `src/server/logging/*` | Upstream failures, CSRF rejects, session refresh failures |
| Browser | Almost nothing in production | User-facing errors via `ApiError.code` only |

Correlation: every BFF `/api/*` handler runs under `withRequestContext`, which
mints or accepts `x-request-id`, stores it in AsyncLocalStorage, forwards it on
upstream calls, and echoes it on the response. Nest reuses the same header via
`genReqId` and echoes it again.

## Levels

| Level | Use |
| ----- | --- |
| `error` | User/request harmed (upstream down, webhook misconfig, amount mismatch) |
| `warn` | Expected failure worth watching (CSRF reject, login fail, refresh reuse) |
| `info` | Business events (order created, checkout started, payment paid) |
| `debug` | Verbose detail — default off in production |

Override with `LOG_LEVEL` on either host (`debug` \| `info` \| `warn` \| `error`).

## Never log

| Item | Why |
| ---- | --- |
| Passwords, JWTs, refresh/access tokens | Credential leak |
| `Cookie` / `Authorization` headers | Session hijack |
| `CSRF_SECRET`, `INTERNAL_PROXY_SECRET`, Stripe secrets | Secret exposure |
| Raw Stripe webhook bodies | PCI / PII |
| Email or phone on every auth line | Prefer `userId`; failed login logs **no** email |

Nest pino redacts common secret paths automatically (`req.headers.authorization`,
`req.body.password`, proxy secret, CSRF header, Stripe signature). Redaction is
defence in depth — still do not put secrets in custom log messages.

## Phase checklist (implemented)

### Phase 1 — operable locally and on platform logs

- Nest: `Logger` on auth / order / payment business events
- BFF: structured logger for upstream + CSRF failures
- Docs: this file

### Phase 2 — correlation + structured production output

- Shared `x-request-id` BFF ↔ Nest
- `nestjs-pino` JSON in production, `pino-pretty` in development
- BFF JSON lines when `NODE_ENV=production`
- Webhook / order / checkout info events

### Phase 3 — production readiness (ops, not more libraries by default)

- `GET /health` on Nest for probes (excluded from access logs)
- `LOG_LEVEL` on both `.env.example` files
- **Do this on the hosts (no code required):**
  1. Vercel → Project → Logs; Railway/Render → Logs
  2. Optional log drain (Axiom, Better Stack, Datadog) — 7–30 day retention
  3. Alert on: upstream 503 spike, webhook signature failures, 5xx rate
  4. Optional later: Sentry (`SENTRY_DSN`) for stack traces — **not** wired yet;
     prefer a real DSN and `@sentry/nextjs` / `@sentry/nestjs` over a half-stub

## How to debug a stuck payment

1. Take `x-request-id` from the browser Network tab on the failing `/api/...` call
   (response header), or from Vercel logs.
2. Grep that id in Vercel (BFF) and Nest host logs.
3. Expect a chain like:
   - BFF → Nest `POST /order` → `Order created orderId=...`
   - BFF → Nest `POST /payment/checkout/...` → `Checkout session created...`
   - Nest webhook `checkout.session.completed` → `Payment ... paid; order ...`
4. If step 3 never appears: Stripe webhook URL / `STRIPE_WEBHOOK_SECRET` / API
   reachability — not the success-page query string.

## Local vs production

| Env | Nest | BFF |
| --- | ---- | --- |
| Development | pino-pretty, level `debug` | Tagged human lines, level `debug` |
| Production | JSON stdout, level `info` | JSON stdout, level `info` |

## Adding a new log

1. Prefer Nest for business truth (orders, payments, auth).
2. Prefer BFF for edge failures (cannot reach API, CSRF).
3. Include stable ids (`userId`, `orderId`, `paymentId`, `requestId`) — never tokens.
4. Do not log every successful `GET /food` — noise and cost on serverless.
