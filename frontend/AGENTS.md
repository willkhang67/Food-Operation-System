<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Jolly Jumbuk — frontend

Customer, kitchen, and admin UI for a food ordering system. Next.js 16 (App
Router, Turbopack), React 19, TypeScript, SCSS Modules.

The Nest API lives on a **separate host** (`API_URL`). The browser never talks to
it directly — every call goes through this app's own `/api/*` routes, which hold
the session cookies and attach the bearer token server-side. That indirection is
the Backend-for-Frontend (BFF), and most of the rules below exist to protect it.

**Read `docs/auth-bff.md` before touching anything under `src/server/`,
`src/lib/api/`, or the checkout pages.**

## Commands

| Task      | Command             |
| --------- | ------------------- |
| Dev       | `npm run dev`       |
| Typecheck | `npx tsc --noEmit`  |
| Lint      | `npm run lint`      |
| Build     | `npm run build`     |

`next lint` was removed in Next 16 — use `npm run lint` (plain `eslint`).
Run typecheck, lint, and build before calling any task done.

## Where code goes

```
src/app/           routes; src/app/api/* are the BFF route handlers
src/components/    UI, grouped by feature (auth, customer, header, layout, common)
src/providers/     React context (AuthProvider, AuthDialogProvider)
src/lib/api/       browser-side API calls — the only place fetch() belongs
src/server/        server-only: env, cookies, session, upstream, csrf, proxy
src/types/         shared types, mirroring the API's DTOs
src/styles/        _breakpoints.scss; design tokens live in src/app/globals.css
```

## Non-negotiables

These are security boundaries, not preferences. Breaking one is a bug even if
the app still runs.

- **Never fetch the Nest API from the browser.** Client code calls `apiFetch`
  from `src/lib/api/`, which uses relative `/api/...` paths only. There is no
  API host and no token in client code.
- **Everything under `src/server/` is server-only** and imports `"server-only"`
  to prove it. Never import it from a Client Component.
- **Every mutating BFF route is wrapped in `withCsrfProtection`.** Applied at
  the export site: `export const POST = withCsrfProtection(async (req) => …)`.
- **New API endpoints usually need no new route.** The catch-all proxy at
  `src/app/api/[...path]/route.ts` forwards everything. Add an explicit handler
  under `src/app/api/auth/` only when the request must read or write cookies.
- **Guarded pages must be Client Components.** A Server Component parent
  serialises `children` into the RSC payload before `RouteGuard` can refuse
  them, which leaks the page to users who are not allowed in:

  ```tsx
  "use client";
  export default function AdminPage() {
    return (
      <RouteGuard roles={["admin"]}>
        <PlaceholderPage title="Admin dashboard" description="…" />
      </RouteGuard>
    );
  }
  ```

- **`RouteGuard` is UX, not enforcement.** Nest's guards are the real boundary.
- **Never treat a query parameter as proof of payment.** Re-read the order from
  the API, which is driven by the signed Stripe webhook.

## Data fetching

Client components fetch through the typed modules in `src/lib/api/` (`authApi`,
`menuApi`, `orderApi`, `paymentApi`) — never bare `fetch`. List/detail reads that
survive tab switches use TanStack Query (`QueryProvider`, keys in
`src/lib/query-keys.ts`). Pass the query `signal` into `apiFetch`. Auth, CSRF,
and checkout mutations stay uncached. Call `queryClient.clear()` on login /
logout (see `AuthProvider`) so private order data cannot leak across accounts.
Do not persist the query cache to `localStorage`.

```ts
useQuery({
  queryKey: queryKeys.menu.foods,
  queryFn: ({ signal }) => menuApi.getFoods({ signal }),
  staleTime: 60_000,
});
```

Branch on `error.code` against `ApiErrorCode`, never on the message text —
messages are user-facing copy and will change.

Keep "signed out" and "server unreachable" distinct. An unreachable API is not
evidence that the visitor is anonymous, and showing them a login prompt is
wrong. `AuthProvider` models this as `anonymous` vs `unavailable`; preserve it.

## Styling

SCSS Modules only, colocated as `ComponentName.module.scss`. Tailwind is
installed but **no utility classes are used in JSX** — don't introduce them.

- Colors, radii, shadows, and transitions come from CSS variables
  (`var(--color-surface)`, `var(--radius-pill)`). Raw hex belongs in
  `globals.css` and nowhere else. The palette is black / white / grey.
- Mobile-first. Import breakpoints as `@use "../../styles/breakpoints" as bp;`
  and wrap larger-viewport rules in `@include bp.md { … }`.
- Conditional classes use `cn()` from `@/lib/cn`, not template strings.

## TypeScript and components

- One default-exported component per file, PascalCase filename matching it.
- Props interfaces are named `ComponentNameProps` and declared above the
  component.
- Shared types live in `src/types` and are imported from `@/types`. Types that
  mirror an API DTO should note it, so drift is visible.
- No `any`. Prefer `unknown` plus a narrowing helper at the boundary.

## Comments

The codebase documents *why*, never *what*. A comment should record a
constraint, a trade-off, or a non-obvious failure mode that the next reader
would otherwise re-litigate. Delete anything that just narrates the line below
it.

```ts
// ❌ Set the cookie
// ✅ Expiring in place (rather than delete) guarantees the attributes match the
//    ones used to set them; a path mismatch would silently leave the cookie.
```

## Working style

Break a task into small verifiable pieces and check each one — typecheck after
edits, exercise a route with `curl` or a real browser before declaring it works.

If you hit a bug or an inconsistency with the API contract, say so and propose
the fix. Do not paper over it, silently work around it, or widen a security rule
to make an error go away.
