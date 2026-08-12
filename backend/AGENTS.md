# Food Web System — Backend (NestJS 11 + TypeORM + PostgreSQL)

Food ordering API for a lunch bar: customers browse a menu and order, staff work a kitchen queue, admins manage the menu. Deployment target is Railway/Render with Supabase Postgres, fronted by a Next.js BFF on Vercel.

## Commands

```bash
npm run start:dev              # watch mode (port 5000)
npm run lint                   # eslint --fix
npx jest src/<domain>/<file>.spec.ts   # single suite (preferred while iterating)
npm test                       # all suites
docker compose up -d           # local Postgres
```

Local DB: `psql -h localhost -U foodapp -d food_db` (password `foodapp`).

## Module layout

Every domain is a self-contained feature module under `src/<domain>/`:

```
<domain>.module.ts  <domain>.controller.ts  <domain>.service.ts
dto/  entities/  enums/  guards/  <file>.spec.ts (colocated)
```

Register entities with `TypeOrmModule.forFeature([...])` in the owning module. `synchronize: true` is on for dev — before deploying to Supabase, switch to migrations.

## Controllers

- Return **response DTOs**, never entities. Request DTOs use `class-validator`; the global `ValidationPipe` runs with `whitelist: true, transform: true`.
- **Route order matters**: static segments (`/all`, `/me`, `/kitchen`) must be declared **above** `:id`, or Nest matches them as an id.
- Always `@Param('id', ParseUUIDPipe)`.
- Use `import type { RequestUser }` when a type appears in a decorated signature, otherwise TS1272.

```typescript
@Get('kitchen')                                  // static route first
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
findKitchenQueue(): Promise<OrderResponseDto[]> { ... }

@Get(':id')
@UseGuards(JwtAuthGuard)
findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) { ... }
```

## AuthZ conventions

- Public reads return **active records only**; admin variants live on `/all` behind `JwtAuthGuard + RolesGuard + @Roles(UserRole.ADMIN)`.
- All writes (POST/PATCH/DELETE) on menu domains are admin-only.
- Ownership checks belong in the service (pass `user.id` + `user.role`), not the controller.
- Rate limits are global (`default` 100/min); auth endpoints add `@Throttle({ auth: { ttl: 60_000, limit: 5 } })`. Stripe webhooks use `@SkipThrottle()`.

## Auth / BFF token model

Nest is a **token issuer only**. It never sets cookies — the Vercel BFF owns `HttpOnly` cookies and forwards `Authorization: Bearer <token>` server-side.

- Access JWT: `typ: 'access'`, signed with `JWT_SECRET`, `JWT_EXPIRES_IN`.
- Refresh JWT: `typ: 'refresh'` + `jti`, signed with a **separate** `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`.
- `JwtStrategy` rejects any token where `typ !== 'access'` and re-reads the role from the DB so demotions take effect immediately.
- Refresh tokens are persisted as **SHA-256 hashes** (`refresh_tokens`), never plaintext. Rotation revokes the old row and keeps the same `familyId`; presenting a revoked token revokes the whole family (theft signal).
- `POST /auth/logout` is best-effort and always returns 204 so BFF logout stays idempotent.

## Security rules

- Passwords: Argon2id via `PasswordHasherService`. Login keeps the timing-safe dummy hash so missing-user and wrong-password paths cost the same.
- PII (email/name/phone) is AES-256-GCM encrypted at rest; email lookups go through the HMAC blind index, never a plaintext column.
- Never log tokens, hashes, or decrypted PII.
- Never store card data. Stripe amounts are derived from server-side order totals, webhook signatures are verified against the raw body (`NestFactory.create(AppModule, { rawBody: true })`), and handlers are idempotent.
- Add every new env var to `.env.example` with a placeholder. Never commit real secrets.

## Data conventions

- Money is `decimal(10, 2)`; totals are computed server-side, never trusted from the client.
- Order items snapshot `foodName` and `unitPrice` at purchase time so later menu edits don't rewrite history.
- Payments are 1:N with orders so retries and failed attempts each get a row.

## Testing

Specs are colocated and mock dependencies rather than hitting the DB. Mock repositories with `getRepositoryToken(Entity)`. When adding a service dependency, update the corresponding `.spec.ts` provider list or the suite fails to compile.

## Style

Match the surrounding code. Comments explain non-obvious constraints (why a route is ordered a certain way, why a hash is timing-safe) — not what the line does.
