# Cafe POS

A web-based Point-of-Sale system for a cafe/restaurant. One backend + one PostgreSQL database serving three role-gated surfaces:

- **Admin Backend** — configuration & reporting
- **POS Terminal** — cashier-facing ordering loop
- **Kitchen Display System (KDS)** — real-time order tickets

> This repository is currently a **foundation scaffold** (base/phase-0). It compiles, boots, and is fully navigable, but business logic is intentionally **not** implemented yet — unimplemented backend handlers `throw new NotImplementedException()` and frontend pages are labelled placeholders. Every gap carries a `// TODO(PRD §x.y)` anchor pointing at the spec. See [`PRD_Cafe_POS.md`](../PRD_Cafe_POS.md) for the authoritative specification.

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| Backend | NestJS + Prisma + PostgreSQL, Passport-JWT, Socket.IO |
| Frontend | React + Vite + TypeScript, Tailwind + shadcn/ui, React Router, TanStack Query, Zustand, MSW |
| Shared types | `@cafe-pos/types` (enums + API/socket contracts) |

## Prerequisites

- Node.js 20+ (LTS)
- pnpm 9+ (`npm i -g pnpm` or `corepack enable pnpm`)
- Docker (for the local Postgres container)

## Quick start

```bash
# 1. Install dependencies (links workspaces)
pnpm install

# 2. Configure environment
cp .env.example .env          # then edit secrets as needed
cp .env apps/api/.env         # the API reads its own .env (or symlink)

# 3. Start Postgres
docker compose up -d

# 4. Apply the schema + seed demo data
pnpm db:migrate               # creates the `init` migration
pnpm db:seed                  # one admin/cashier/kitchen user, categories, products, etc.

# 5. Run everything (api on :3000, web on :5173)
pnpm dev
```

Then open:

- POS / Admin / KDS SPA → http://localhost:5173
- API health check → http://localhost:3000/api/health
- Swagger API docs → http://localhost:3000/api/docs

## Seeded credentials

The seed (`apps/api/prisma/seed.ts`) creates one user per role (password `password123`):

| Role | Username | Email |
|---|---|---|
| Admin | `admin` | `admin@cafe.local` |
| Cashier | `cashier` | `cashier@cafe.local` |
| Kitchen | `kitchen` | `kitchen@cafe.local` |

## Workspace scripts (run from repo root)

| Script | Action |
|---|---|
| `pnpm dev` | Run API + Web concurrently |
| `pnpm build` | Build types → api → web |
| `pnpm lint` | Lint every package |
| `pnpm format` | Prettier-format the repo |
| `pnpm db:migrate` | `prisma migrate dev` (api) |
| `pnpm db:seed` | `prisma db seed` (api) |
| `pnpm db:reset` | `prisma migrate reset --force` (api) |

## Project layout

```
cafe-pos/
├─ packages/types/      # @cafe-pos/types — shared enums + contract types
└─ apps/
   ├─ api/              # NestJS backend (module-per-domain, Prisma, Socket.IO)
   └─ web/              # React + Vite SPA (POS / Admin / KDS, role-gated)
```

### Full tree (source, excluding build artifacts)

```
cafe-pos/
├─ package.json · pnpm-workspace.yaml · tsconfig.base.json
├─ docker-compose.yml · .env.example · .gitignore · .prettierrc · .eslintrc.cjs
├─ packages/
│  └─ types/                 # @cafe-pos/types — enums, response envelopes, socket payloads
│     └─ src/index.ts
└─ apps/
   ├─ api/                   # NestJS backend
   │  ├─ prisma/
   │  │  ├─ schema.prisma     # full 14-model schema (PRD §6) + indexes (§16.5)
   │  │  └─ seed.ts           # admin/cashier/kitchen + catalog + floor/tables + register
   │  └─ src/
   │     ├─ main.ts           # CORS, ValidationPipe, Swagger /api/docs, prefix /api
   │     ├─ app.module.ts     # ConfigModule + Prisma + Realtime + 15 domain modules + global guards
   │     ├─ config/           # env schema + validation (fail-fast)
   │     ├─ prisma/           # PrismaModule + PrismaService
   │     ├─ common/           # guards (jwt-auth, roles) · decorators (@Roles/@CurrentUser/@Public)
   │     │                    #   filters (error envelope) · interceptors (success envelope) · dto
   │     ├─ realtime/         # Socket.IO gateway: kitchen+floor rooms, JWT handshake, emit helpers
   │     ├─ health/           # GET /api/health (public)
   │     ├─ auth/             # controller + service + jwt & jwt-refresh strategies + dto
   │     └─ users/ categories/ products/ payment-methods/ promotions/ floors/ tables/
   │        customers/ registers/ sessions/ orders/ payments/ kds/ bookings/ reports/
   └─ web/                    # React + Vite SPA
      ├─ index.html · vite.config.ts · tailwind.config.ts · postcss.config.js · components.json
      └─ src/
         ├─ main.tsx · App.tsx · index.css
         ├─ lib/              # api.ts (token + refresh-on-401) · socket.ts · queryClient.ts · utils.ts
         ├─ providers/        # AppProviders (QueryClient + Auth)
         ├─ stores/           # auth.store.ts · cart.store.ts (zustand)
         ├─ auth/             # AuthContext/useAuth · RoleGuard
         ├─ routes/           # router.tsx + pos/ admin/ kds/ placeholder pages
         ├─ components/       # layout/ (AppShell, TopNav, HamburgerMenu) · shells/ · ui/ (shadcn)
         ├─ types/            # re-export @cafe-pos/types
         └─ mocks/            # MSW browser.ts + handlers.ts (empty, ready to extend)
```

## Where feature work begins (`TODO(PRD §x.y)` anchors)

Every unimplemented handler/page carries a `// TODO(PRD §x.y)` pointer to its spec section.
Search the repo for `TODO(PRD` to jump to all of them. Summary by app:

### Backend — `apps/api` (handlers throw `NotImplementedException`)

| Module | Anchors |
|---|---|
| `auth/` | §13.1 signup/login/refresh/logout/me · §21.1 email-or-username · §16.1 token rotation & ARCHIVED check |
| `users/` | §13.2 / §8.7 list/create/update/change-password/archive/delete |
| `categories/` | §13.3 / §8.3 CRUD · §6 archive-if-referenced |
| `products/` | §13.4 / §8.2 CRUD (filter by categoryId) · §6 archive-if-referenced |
| `payment-methods/` | §13.5 / §8.4 CRUD + toggle · UPI-id-required-when-UPI |
| `promotions/` | §13.6 / §8.5 CRUD · §7.1 validate-coupon discount preview |
| `floors/` · `tables/` | §13.7 / §8.6 floors+tables CRUD · derived table status |
| `customers/` | §13.8 / §9.9 CRUD |
| `registers/` · `sessions/` | §13.9 / §7.3 registers list/create · session current/open/close |
| `orders/` | §13.10 create/update/detail/list · §7.1 pricing & coupon · §7.6 send-to-kitchen · §16.2 optimistic lock |
| `payments/` | §13.11 cash + Razorpay create/verify/webhook · §13.12 receipt PDF/email · §15 integrations |
| `kds/` | §13.13 tickets list / advance / toggle-item · §7.6 / §10 |
| `bookings/` | §13.14 / §8.8 CRUD + status |
| `reports/` | §13.15 / §11 summary/trend/top-*/export · §15.3 PDF/XLS |
| `realtime/` | §14 emit helpers are wired; the business triggers that call them live in orders/kds/payments |

### Frontend — `apps/web` (labelled placeholder pages)

| Area | Anchors |
|---|---|
| `routes/Login.tsx`, `Signup.tsx` | §8.1 wire to `/auth/login` & `/auth/signup` |
| `routes/pos/*` | §9.2 session landing · §9.4 Order View · §9.7 Orders/detail · §9.8 Table View · §9.9 Customers |
| `routes/admin/*` | §8.2–§8.8 / §11 Products, Categories (ListShell demo), Payment Methods, Promotions, Bookings, Users, Reports |
| `routes/kds/Kds.tsx` | §10 / §13.13 tickets, stages, filters, live updates |
| `components/shells/*` | reusable ListShell / FormShell / InlineCreateModal — wire to TanStack Query + the API during feature work |

> Out of scope for this phase (do not infer as missing): the pricing engine, discount/coupon math, real persistence, Razorpay/Nodemailer/Puppeteer/ExcelJS, report aggregation, KDS/floor business triggers, and finished UI screens. See PRD §19 for the build sequencing.
