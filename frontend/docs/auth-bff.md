# Auth, the BFF, and CSRF

How the browser talks to the Nest API, why it goes through this app instead of
directly, and what protects it. Read this before changing anything under
`src/server/` or `src/lib/api/`.

## The shape of it

```
browser  ──/api/*──▶  Next route handlers (the BFF)  ──Bearer──▶  Nest API
         cookies                 server only                      Railway/Render
```

The browser never sees the API host and never sees a token. It holds three
cookies on this app's own origin, and the BFF turns them into the `Authorization`
header the API expects.

| Cookie       | httpOnly | Path   | Holds                        |
| ------------ | -------- | ------ | ---------------------------- |
| `jj_access`  | yes      | `/`    | Short-lived access token     |
| `jj_refresh` | yes      | `/api` | Rotating refresh token       |
| `jj_csrf`    | **no**   | `/`    | Double-submit CSRF token     |

`jj_csrf` is readable by design — copying it into a request header is the whole
mechanism. It is not a credential and grants nothing on its own.

## Routes

`src/app/api/auth/*` are written by hand because they touch cookies.
`src/app/api/[...path]` forwards everything else to the API unchanged.

| Route                | Method | CSRF | Notes                                        |
| -------------------- | ------ | ---- | -------------------------------------------- |
| `/api/auth/csrf`     | GET    | n/a  | Issues or reuses the token                    |
| `/api/auth/me`       | GET    | n/a  | Resolves the session, rotating if needed      |
| `/api/auth/login`    | POST   | yes  | Rotates the CSRF token on success             |
| `/api/auth/register` | POST   | yes  | Rotates the CSRF token on success             |
| `/api/auth/refresh`  | POST   | yes  | Rotates the token pair                        |
| `/api/auth/logout`   | POST   | yes  | Always clears cookies, even if the API is down |
| `/api/*`             | any    | yes on writes | Proxy; `auth/*` and `payment/webhook` are refused |

## CSRF

`SameSite=Lax` already blocks the classic cross-site form POST, but it is
enforced by the browser rather than by us — an old browser, an embedded webview,
or a future reason to relax the attribute would quietly remove the only defence.
So `src/server/http/csrf.ts` adds two independent layers, which is what OWASP
recommends over picking one.

**Origin check.** Browsers attach `Origin` to every non-GET fetch and a
cross-site page cannot forge it. The value is compared against the host the
request was actually addressed to (`x-forwarded-host`, falling back to `host`),
so it works on preview deployments and custom domains without configuration.

**Signed double-submit token.** A random 32-byte value is stored in `jj_csrf`
and must be echoed in `X-CSRF-Token`. A cross-site page can cause the cookie to
be *sent* but can never *read* it, so it cannot produce the header. The value
carries an HMAC so only tokens this app issued are accepted, which closes the
cookie-injection hole in naive double-submit.

Both comparisons are constant-time. Every rejection returns the same 403 and
`CSRF_REJECTED`; the reason is logged server-side only.

### Why login and register are protected too

Without it, a cross-site page can sign a visitor into an account the *attacker*
controls. The visitor then adds a card, or places an order, against someone
else's account. This is login CSRF, and it matters more than usual here because
this app takes payments. The cost is one lazy `GET /api/auth/csrf` before the
first write of a session.

### The client half

`src/lib/api/client.ts` attaches the header to unsafe methods only. It reads the
cookie first and falls back to the bootstrap endpoint, sharing one in-flight
request so a burst of writes does not stampede. A `CSRF_REJECTED` response is
retried exactly once with a fresh token — safe by construction, because a request
stopped at the CSRF gate never reached the API.

### What this does not cover

The token is not bound to a specific user. Binding it would mean resolving the
session before the check, which costs an upstream call on every write; the origin
check already covers the case binding would add. Revisit if the API ever gains
cookie-writing subdomains.

## Environment

| Variable         | Required            | Notes                                       |
| ---------------- | ------------------- | ------------------------------------------- |
| `API_URL`        | always              | Base URL of the Nest API                     |
| `API_TIMEOUT_MS` | no (default 20000)  | Raise for hosts with cold starts             |
| `CSRF_SECRET`    | **in production**   | ≥32 chars, `openssl rand -base64 32`         |

`CSRF_SECRET` fails closed: production boots without it, but every write throws
rather than silently downgrading to a guessable key. Outside production a
built-in development value is used so `git clone && npm run dev` works.

Rotating the secret invalidates every outstanding CSRF token. Users see one
rejected write, which the client retries transparently. It does not sign anyone
out.

## Stripe

The API owns the money. This app owns two return pages.

**The webhook never touches the BFF.** Stripe posts to the Nest API directly and
the signature is computed over the raw body, which a proxy would corrupt. There
is also no legitimate browser caller, so `payment/webhook` is on the proxy's
deny-list and returns 404. Point `STRIPE_WEBHOOK_URL` at the API host, not Vercel.

**Return URLs belong to this app.** Nest builds them from its own `FRONTEND_URL`:

- `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
- `${FRONTEND_URL}/checkout/cancel`

Both pages are `noindex`: return URLs carry order references.

**The query string is never evidence of payment.** Anyone can type
`/checkout/success` into the address bar. The success page treats the query as a
pointer only and re-reads the order from the API, which is driven by the signed
webhook. Because the webhook can land a moment after the redirect, the page polls
for up to 20 seconds and then says "still confirming" rather than claiming
success it cannot verify.

### Known gap: `success_url` carries no order id

`success_url` includes `session_id` but no `orderId`, and the API has no endpoint
that resolves a Stripe session id to an order. So the success page cannot
currently name the order it is confirming, and falls back to a generic
"we are processing it" message with a link to order history.

The fix is one line in `payment.service.ts`:

```ts
success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
```

Passing the order id in the URL is safe: `GET /order/:id` is guarded and checks
ownership, so a forged id returns 403 or 404 rather than someone else's order.
The page already handles the parameter — it activates as soon as the API sends it.

## Still outstanding

- **Refresh grace window (API).** Rotation revokes the presented token
  immediately. The BFF de-duplicates concurrent redemptions, but a retry after a
  dropped response still replays a spent token and trips theft detection. A few
  seconds of grace on the API side would remove the last sharp edge.
- **Client IP for rate limiting (API).** The proxy forwards `x-forwarded-for`,
  but until Nest trusts it, every user looks like one IP to the throttler.
