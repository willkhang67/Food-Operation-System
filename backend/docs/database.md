# Database: migrations, schema drift, and Supabase access

Read this before changing entities or deploying the Nest API to Supabase.

## Architecture

```
Browser → Vercel BFF → Nest API → Supabase Postgres (direct connection)
```

Only **Nest** should read/write app tables (`foods`, `orders`, `users`, …). The Supabase **Data API** (PostgREST) and **anon key** must not expose those tables to the public internet.

---

## 1. Migrations vs `synchronize` (implemented)

| Mode | When | Behaviour |
| ---- | ---- | --------- |
| `TYPEORM_SYNCHRONIZE=true` | Local dev only | TypeORM alters DB to match entities on boot. Fast, not for prod. |
| `TYPEORM_SYNCHRONIZE` unset / `false` | Production (default) | Schema unchanged on boot. |
| `TYPEORM_MIGRATIONS_RUN=true` | Production deploy | Applies pending files in `src/database/migrations/` on boot. |
| `npm run migration:run` | Manual / CI | Build + run migrations before start (alternative to auto-run). |

**Production rule:** `NODE_ENV=production` **forces** `synchronize: false` even if `TYPEORM_SYNCHRONIZE=true` is set by mistake.

### Render deploy (recommended)

**Root directory:** `backend` (if the repo is the monorepo root).

**Build command** — must install devDependencies (`typescript`, etc.). If `NODE_ENV=production` is set in Render env, plain `npm ci` skips them and the build fails with `nest: not found` or `tsc: not found`:

```bash
npm ci --include=dev && npm run build
```

**Start command:**

```bash
npm run start:prod
```

With `TYPEORM_MIGRATIONS_RUN=true`, migrations run on boot (no separate `migration:run` needed in start).

**Environment:**

```env
NODE_ENV=production
TYPEORM_SYNCHRONIZE=false
TYPEORM_MIGRATIONS_RUN=true
```

Optional: after build, prune dev deps to shrink the slug (start command stays the same):

```bash
npm ci --include=dev && npm run build && npm prune --omit=dev
```

### Local fresh database (docker)

```bash
docker compose up -d
# One-time bootstrap for empty DB:
TYPEORM_SYNCHRONIZE=true npm run start:dev
# Then turn sync off and use migrations for all future changes:
TYPEORM_SYNCHRONIZE=false npm run migration:run
```

### Adding a schema change later

1. Edit the entity.
2. Add a new file under `src/database/migrations/` (timestamped, with `up` / `down`).
3. Prefer idempotent SQL (`ADD COLUMN IF NOT EXISTS`) when catching up prod.
4. Run `npm run migration:run` on staging, then production.

---

## 2. Schema drift — what it is and how to fix it

**Drift** means the **code expects a schema** that **production Postgres does not have** (or has an old variant). The API may boot but fail at runtime with errors like “column does not exist” or invalid enum value.

### How drift happens in this project

- Earlier deploys used `synchronize: true` on some environments but not others.
- Manual edits in Supabase Table Editor.
- Features merged before prod was migrated (`ready`, kitchen ETA, `cook_time`).

### Drift checklist for this app

Run in **Supabase → SQL Editor** to inspect:

```sql
-- Order status enum values
SELECT e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'orders_status_enum'
ORDER BY e.enumsortorder;

-- Kitchen / ETA columns on orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('estimated_ready_at', 'paid_at', 'status');

-- Cook time snapshot on line items
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'cook_time';

-- Applied migrations
SELECT * FROM typeorm_migrations ORDER BY id;
```

### What each piece is for

| Object | Purpose |
| ------ | ------- |
| `orders.status = 'ready'` | Replaces legacy `delivered`. Kitchen marks ready; customer sees ready. |
| `orders.estimated_ready_at` | Kitchen countdown deadline (`paidAt + Σ cook_time`). |
| `orders.paid_at` | When Stripe confirmed payment; kitchen sort/display. |
| `order_items.cook_time` | Snapshot of menu cook time at order create; ETA does not drift if menu changes. |

### Catch-up migration (already in repo)

`1735689600000-OrderKitchenAndCookTime.ts` is **idempotent**:

- Adds enum value `ready` if missing.
- Updates rows still on `delivered` → `ready`.
- Adds `estimated_ready_at`, `paid_at`, `order_items.cook_time` if missing.

**On production:** run `npm run migration:run` once (or set `TYPEORM_MIGRATIONS_RUN=true` on one deploy).

**If migration table is empty but DB already has columns:** migration still succeeds (IF NOT EXISTS / no-op updates).

**If you applied the same SQL manually:** migration is safe to run again; TypeORM records it once in `typeorm_migrations`.

### Cleaning bad data (your choice)

Old paid orders with wrong 15‑minute ETA are **data**, not schema. Delete or recompute in SQL separately; migrations do not rewrite historical `estimated_ready_at`.

---

## 3. Supabase: Nest as sole writer (bullet 5)

### Goal

| Actor | Should access app tables? |
| ----- | ------------------------- |
| Nest API (Render) with DB password | Yes — only application path |
| Browser with Supabase anon/authenticated key | **No** |
| PostgREST `/rest/v1/foods` etc. | **No** for customers |
| You in SQL Editor | Yes — break-glass admin |

Your security model is **Nest JWT + roles**, not “RLS policies per Supabase client.” That is valid if Postgres is reachable **only** by Nest and PostgREST is locked down.

### Step-by-step in Supabase Dashboard

#### A. Confirm how Nest connects

Render env should use **direct Postgres** or **pooler** credentials (host, port, user, password, database) — **not** the anon or service_role **API keys** for TypeORM.

Typical Render vars:

```env
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_USERNAME=postgres.<project-ref>
DB_PASSWORD=<database-password>
DB_NAME=postgres
```

#### B. Enable RLS on app tables

**Database → Tables →** for each app table (`users`, `foods`, `categories`, `orders`, `order_items`, `payments`, `refresh_tokens`, `food_images`, `food_categories`):

1. Open table → **RLS** → **Enable RLS**.

With RLS on and **no policies**, only the database owner / superuser role used by Nest bypasses RLS (depending on role). PostgREST roles (`anon`, `authenticated`) get **zero rows** and cannot insert.

#### C. Do not grant API access to app tables

In **Database → Roles** (or SQL), ensure `anon` and `authenticated` do not have `SELECT/INSERT/UPDATE/DELETE` on app tables.

Quick audit SQL:

```sql
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'foods', 'categories', 'orders', 'order_items',
    'payments', 'refresh_tokens', 'food_images', 'food_categories'
  )
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;
```

**Target:** no rows (or revoke if any appear):

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
```

(Adjust if you later add a Supabase Auth integration — this app does not use it for ordering.)

#### D. Frontend must not ship Supabase keys for data

Your Next.js app should **not** have:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

for reading `foods` / `orders`. All data goes through `/api/*` → Nest.

#### E. Verify lockdown

1. In Supabase **Project Settings → API**, copy the anon key (for test only).
2. Try:

```bash
curl "https://<project-ref>.supabase.co/rest/v1/foods?select=*" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"
```

**Expected:** `401`, `403`, or empty/forbidden — **not** your menu JSON.

3. Confirm Nest still works: menu loads on the site, kitchen queue loads when staff is logged in.

### What if Nest stops working after enabling RLS?

Nest’s DB user must be able to read/write. Usually the `postgres` / pooler user is table owner and bypasses RLS. If you use a restricted role, either:

- Grant that role bypass, or
- Add explicit policies for that role only (advanced; not needed for default Supabase pooler user).

### Industrial summary

- **Single write path:** Nest only.
- **Defense in depth:** RLS on + no anon grants, even if someone leaks the anon key.
- **No dual auth:** don’t mix Supabase Auth client reads with Nest JWT for the same tables without a unified policy story.

---

## Troubleshooting

| Symptom | Check |
| ------- | ----- |
| `column "cook_time" does not exist` | Run `npm run migration:run` on API host |
| Kitchen shows 15 min on new orders | Old row or API not redeployed; not a migration issue |
| `invalid input value for enum` | Enum missing `ready`; run catch-up migration |
| Migration already applied error | `typeorm_migrations` table; use `migration:show` |
| Menu works, curl anon fails | Good — lockdown working |
