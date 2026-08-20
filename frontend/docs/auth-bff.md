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
| `INTERNAL_PROXY_SECRET` | no       | Shared with the API; see rate limiting below |

`CSRF_SECRET` fails closed: production boots without it, but every write throws
rather than silently downgrading to a guessable key. Outside production a
built-in development value is used so `git clone && npm run dev` works.

Rotating the secret invalidates every outstanding CSRF token. Users see one
rejected write, which the client retries transparently. It does not sign anyone
out.

## Rate limiting and the client IP

Every browser request reaches the API through this app, so from the API's side
the socket address is always the BFF's. Left alone the throttler treats the whole
user base as one client — five login attempts a minute for everybody.

Forwarding `x-forwarded-for` is not enough on its own, and trusting it blindly is
worse than the original problem: the API has a public URL, so anyone can bypass
this app and send whatever forwarding header they like, and a fresh spoofed IP per
attempt buys unlimited login tries. Express's `trust proxy` does not fix that
either, because it decides trust by counting network hops and a direct attacker
controls their own hop.

So trust comes from a shared secret rather than from network position:

1. `upstreamFetch` resolves the visitor's IP from the incoming request and sends
   it as `x-client-ip`, alongside `x-internal-proxy-secret`. It lives there, not
   in `proxy.ts`, so the auth routes get it too — login is where per-visitor
   throttling matters most.
2. `ProxyAwareThrottlerGuard` on the API compares that secret in constant time
   and only then believes `x-client-ip`. Otherwise it buckets by socket address.

Two properties worth preserving:

- **It fails closed.** A missing or wrong secret means everyone shares one
  bucket: more restrictive, never less. That is why absence is tolerated rather
  than fatal — but a *weak* secret is rejected in production, since a guessable
  one hands out IP spoofing to anybody.
- **The trust is scoped to the throttler.** Global `trust proxy` stays off, so a
  forged header cannot reach `req.ip` anywhere else.

Set the same value in both apps, or neither. One side alone does nothing.

One assumption: the platform in front of this app must overwrite inbound
`x-forwarded-for` rather than append to it. Vercel does. Deploying the BFF with
no trusted edge in front of it would let a browser choose its own rate-limit
bucket.

## Stripe

The API owns the money. This app owns two return pages.

**The webhook never touches the BFF.** Stripe posts to the Nest API directly and
the signature is computed over the raw body, which a proxy would corrupt. There
is also no legitimate browser caller, so `payment/webhook` is on the proxy's
deny-list and returns 404. Point `STRIPE_WEBHOOK_URL` at the API host, not Vercel.

**Return URLs belong to this app.** Nest builds them from its own `FRONTEND_URL`:

- `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=…`
- `${FRONTEND_URL}/checkout/cancel`

Both pages are `noindex`: return URLs carry order references.

**The query string is never evidence of payment.** Anyone can type
`/checkout/success` into the address bar. The success page treats the query as a
pointer only and re-reads the order from the API, which is driven by the signed
webhook. Because the webhook can land a moment after the redirect, the page polls
for up to 20 seconds and then says "still confirming" rather than claiming
success it cannot verify.

### The order id in `success_url`

`success_url` carries `orderId` as well as `session_id`, because the API has no
endpoint that resolves a Stripe session id back to an order — without it the
success page could not name what it was confirming.

Passing it in the URL is safe: `GET /order/:id` is guarded and checks ownership,
so a forged id returns 403 or 404 rather than someone else's order. It is a
pointer, not proof; the signed webhook is still what marks the order paid.

### Where the return pages send people

Both return pages hand off to `/customer/orders`, which reads `GET /order/me` —
scoped to the caller's own id by the API, so there is no id to tamper with.

That page is what makes webhook lag survivable rather than a dead end. The
success page gives up politely after 20 seconds, and a customer who lands on
their order list while an order still reads as unpaid gets a Refresh control and
a line telling them confirmation can take a few seconds. Anything still unpaid
offers **Pay now**, which starts a fresh Stripe session for that same order
instead of asking them to rebuild a cart the tab may no longer hold.

The list is a snapshot, so `Pay now` treats a 409, a 400, or a 404 from
`POST /payment/checkout/:id` as "the API has moved on" and re-reads rather than
arguing with it.

## Still outstanding

- **Refresh grace window (API).** Rotation revokes the presented token
  immediately. The BFF de-duplicates concurrent redemptions, but a retry after a
  dropped response still replays a spent token and trips theft detection. A few
  seconds of grace on the API side would remove the last sharp edge.
- **Session-scoped cart.** The cart lives in `sessionStorage`, so it does not
  follow a customer between devices or survive closing the tab.
- **No auto-refresh on the order list.** Confirmation is a Refresh press, not a
  poll. Deliberate for now: polling every open order list costs requests on a
  rate-limited API to save one tap.

### Deliberately out of scope

Chosen deferrals rather than oversights — the customer payment path is shippable
without them, and each one would widen it without making it more trustworthy:

| Deferred | Why it can wait |
| --- | --- |
| Kitchen display / order queue UI | Staff-facing; the API's `GET /order/kitchen` already exists for it |
| Admin CRUD and sell-out toggles | Admin-facing; the customer path only reads availability |
| Delivery, item modifiers, tips | Each changes what an order *is*, so it changes pricing and the DTO |
| Guest checkout | Orders are owned by a user id; anonymous ownership is a data-model decision |
| Server-side cart | Needs endpoints and a merge story for two devices; `sessionStorage` covers one tab |
| Order cancellation from the UI | `PATCH /order/:id/cancel` exists and is owner-checked, but Pay now already clears the dead end |
| Retiring the `RoleNav` demo chrome | A real product smell, but changing navigation mid-payment-path buys no confidence in the payment path |

## Logging

Structured logging, `x-request-id` correlation, and the never-log list live in
[`logging.md`](./logging.md). Read that before adding `console.*` under
`src/server/` or Nest services.
