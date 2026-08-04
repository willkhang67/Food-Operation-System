# Frontend structure — Jolly Jumbuk

Next.js App Router UI for the Food Operation System. Brand: **Jolly Jumbuk**. Talks to a NestJS backend (default `https://localhost:5000`).

## Stack

| Piece | Version / notes |
|---|---|
| Next.js | 16.2 (App Router, Turbopack in dev) |
| React | 19.2 + React Compiler (`reactCompiler: true`) |
| Styling | Tailwind CSS 4 via `@tailwindcss/postcss` |
| Icons | `lucide-react` |
| Fonts | Fraunces (display), Nunito (body) via `next/font` |
| Path alias | `@/*` → `./src/*` |

Scripts: `npm run dev` · `build` · `start` · `lint`

Env: set `NEXT_PUBLIC_API_URL` in `.env.local` to override the API base URL.

---

## Directory tree

```
frontend/
├── public/                 # Static assets (default Next SVG placeholders)
├── src/
│   ├── app/                # Routes (App Router)
│   │   ├── layout.tsx      # Root shell: fonts, RoleNav, metadata
│   │   ├── page.tsx        # `/` → redirects to `/customer`
│   │   ├── globals.css     # Tailwind import + CSS variables
│   │   ├── demo/page.tsx
│   │   ├── customer/
│   │   │   ├── page.tsx           # Menu (live)
│   │   │   ├── orders/page.tsx    # Placeholder
│   │   │   └── account/page.tsx   # Placeholder
│   │   ├── kitchen/page.tsx       # Placeholder
│   │   └── admin/page.tsx         # Placeholder
│   ├── components/
│   │   ├── layout/
│   │   │   └── RoleNav.tsx        # Top role switcher (all pages)
│   │   └── customer/
│   │       ├── BottomNav.tsx      # Menu / Orders / Account tabs
│   │       ├── CategoryTabs.tsx   # Horizontal category pills
│   │       └── FoodCard.tsx       # Food image + price + add button
│   ├── lib/
│   │   └── api.ts                 # Fetch client for backend
│   └── types/
│       └── index.ts               # Category, Food, FoodImage
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── package.json
├── AGENTS.md / CLAUDE.md          # Agent notes (read Next docs in node_modules)
└── setup.sh
```

---

## Routing map

```
/  ──────────────────────────►  redirect → /customer

/demo                          Role picker (Customer / Kitchen / Admin)

/customer                      Live menu: categories + foods from API
/customer/orders               Stub — waiting on order API wiring
/customer/account              Stub — waiting on auth/profile wiring

/kitchen                       Stub — kitchen queue UI
/admin                         Stub — admin CRUD UI
```

Root layout wraps every page with:

1. **RoleNav** — sticky dark bar: DEMO · Customer · Kitchen · Admin  
2. Page content  
3. Customer pages also mount **BottomNav** (fixed bottom)

`lang="vi"` on `<html>`; copy is mixed Vietnamese / English.

---

## Layers

### `src/app` — pages

| File | Role |
|---|---|
| `layout.tsx` | Metadata title “Jolly Jumbuk”, font CSS variables, cream body bg, mounts `RoleNav` |
| `page.tsx` | Server redirect to `/customer` |
| `customer/page.tsx` | Client page: loads categories + foods, filters by tab, renders cards |
| `customer/orders\|account` | Placeholder copy only |
| `kitchen\|admin` | Placeholder copy only |
| `demo/page.tsx` | Three links into the role areas |

### `src/components` — UI pieces

| Component | Used by | Notes |
|---|---|---|
| `RoleNav` | Root layout | Path-based active state |
| `BottomNav` | Customer routes | Menu / Orders / Account |
| `CategoryTabs` | Customer menu | Includes synthetic `"all"` tab |
| `FoodCard` | Customer menu | Optional `onAdd`; sold-out overlay when `!is_available` |

### `src/lib/api.ts` — data access

Thin `fetch` wrapper (`cache: "no-store"`). Throws `ApiError` with HTTP status.

| Method | Backend |
|---|---|
| `getCategories()` | `GET /category` |
| `getFoods()` | `GET /food` |
| `getFood(id)` | `GET /food/:id` |

No auth headers yet. Order, payment, user, and admin endpoints are not wrapped.

### `src/types` — shared models

- `Category` — id, name, description, status, timestamps  
- `Food` — id, name, price, description, `is_available`, status, categories[], optional images[], timestamps  
- `FoodImage` — id, url  

Aligned with public Nest category/food responses.

---

## Data flow (customer menu)

```
CustomerMenuPage (client)
  │
  ├─ useEffect → Promise.all([api.getCategories(), api.getFoods()])
  │
  ├─ CategoryTabs  ← categories, selectedId
  │       │ onSelect
  │       ▼
  ├─ filter foods by category (or "all")
  │
  └─ FoodCard[]  ← filtered foods
         │ onAdd? (not wired — no cart yet)
```

---

## Design tokens (in use)

| Token | Value | Where |
|---|---|---|
| Page / header bg | `#F5F1E8` | layout, customer header |
| Accent | `#E07B39` | pills, buttons, active nav |
| RoleNav bg | `#211C16` | top bar |
| Display font | `var(--font-display)` → Fraunces | headings, brand |
| Body font | `var(--font-body)` → Nunito | layout body |

Customer shell is **mobile-first** (`max-w-md`). Admin/kitchen/demo use wider containers.

`globals.css` still has create-next-app defaults (Geist vars, prefers-color-scheme dark); the live look is mostly driven by Tailwind classes in layout/pages, not those CSS variables.

---

## Config notes

- **`next.config.ts`** — React Compiler on; no image remotePatterns yet (food images use `<img>`, not `next/image`).
- **`tsconfig.json`** — `strict`, `@/*` paths.
- **Agent docs** — `AGENTS.md` / `CLAUDE.md` warn this Next version may differ from training data; check `node_modules/next/dist/docs/` before changing framework APIs.

---

## What’s implemented vs stubbed

| Feature | Status |
|---|---|
| Browse menu by category | Done |
| Food images / sold-out | Done |
| Add-to-cart / checkout | Not started (`FoodCard.onAdd` unused) |
| Orders list | Stub page |
| Account / login | Stub page |
| Kitchen queue | Stub page |
| Admin dashboard | Stub page |
| API auth (JWT) | Not in `api.ts` |

Backend already exposes auth, orders (incl. kitchen), payment, and admin food/category CRUD — frontend has not consumed them beyond public menu GETs.
