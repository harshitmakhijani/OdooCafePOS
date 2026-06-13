# Cafe POS — Codebase Audit Report

**Target:** `cafe-pos-harshit/` (NestJS + Prisma + Postgres backend, React/Vite frontend)
**Audited against:** `PRD_Cafe_POS.md` (authoritative spec)
**Date:** 2026-06-13
**Method:** Full read of all backend modules + frontend core; objective build/lint/test runs; manual verification of every Critical/High finding against the source (each carries a `file:line`).

---

## 1. Executive summary

The backend is substantially implemented (auth, sessions, pricing, orders, cash + Razorpay payments, receipts, realtime, reports, and most CRUD). **The pricing engine is correct** (verified against the PRD worked example → ₹303.20, plus 15/15 unit tests). However, the audit found **payment-integrity bypasses that let an order be marked PAID without a real payment**, several **security gaps** (no auth rate-limiting, archived-user revocation, hardcoded secret fallbacks, open self-signup, any-origin socket CORS), **concurrency correctness bugs** (non-atomic optimistic lock), a **duplicate route with divergent logic**, **response-envelope corruption** on reports + KDS, and one **fully stubbed module** (Customers).

### Objective checks (all pass — bugs below are logic/security, not compile errors)

| Check | Result |
|---|---|
| `pnpm --filter @cafe-pos/api build` | ✅ pass |
| `pnpm --filter @cafe-pos/web build` (tsc + vite) | ✅ pass |
| `pnpm lint` (workspace) | ✅ 0 errors |
| `pnpm --filter @cafe-pos/api test` (pricing) | ✅ 15/15 |

### Findings by severity

| Severity | Count |
|---|---|
| 🔴 Critical | 2 |
| 🟠 High | 11 |
| 🟡 Medium | 14 |
| ⚪ Low / Informational | 10 |
| **Total** | **37** |

---

## 2. 🔴 Critical

### C1 — Razorpay payment verification is bypassable; any order can be marked PAID without paying
**`apps/api/src/payments/payments.service.ts:190`**
```ts
if (!dto.razorpay_order_id.startsWith('order_mock_') && keySecret) { /* HMAC check */ }
```
Two bypasses, both leading to `markPaid()` (`:208-226`):
1. **Client-controlled prefix:** the caller supplies `razorpay_order_id`. Posting `"order_mock_anything"` skips the entire signature branch — the order is marked PAID with attacker-supplied values. Any authenticated cashier can clear any order's balance with zero payment.
2. **Empty secret:** `RAZORPAY_KEY_SECRET` is `@IsOptional()` defaulting to `''` (`config/env.validation.ts:60-66`), so when unset, `keySecret` is falsy and verification is skipped for **every** order.

**Impact:** Defeats the "real payment integration / signature verification mandatory" requirement (PRD §15.1, §13.11, §16.1); direct revenue-integrity / fraud hole.
**Fix:** Require a non-empty `keySecret`; always compute and `timingSafeEqual`-compare the HMAC; never branch on a client-supplied `order_mock_` prefix (track mock vs real server-side).

### C2 — Razorpay webhook signature check is skipped when the webhook secret is unset (public endpoint)
**`apps/api/src/payments/payments.service.ts:239`** + **`payments.controller.ts:39` (`@Public()`)**
```ts
if (webhookSecret && signature) { /* verify */ }   // skipped entirely if secret is ''
```
`RAZORPAY_WEBHOOK_SECRET` is `@IsOptional()` default `''` (`env.validation.ts:65-66`). With no secret configured, the **public, unauthenticated** `/api/payments/webhook` accepts any unsigned body claiming `event: "payment.captured"` with a known `razorpayOrderId` and marks that order PAID (`:254-277`).
**Impact:** Unauthenticated order-paid forgery in the default config (PRD §15.1, §16.1 — webhook verification mandatory).
**Fix:** Refuse to process (or refuse to boot) when the webhook secret is missing; always verify.

---

## 3. 🟠 High

### H1 — Duplicate route `POST /orders/:id/pay/cash` with divergent logic; one handler is dead code
**`apps/api/src/orders/orders.controller.ts:81`** and **`apps/api/src/payments/payments.controller.ts:18`** both register the same path. Since `OrdersModule` is imported before `PaymentsModule` (`app.module.ts`), Express serves `OrdersController.payCash` → `OrdersService.payCash`, and **`PaymentsService.payCash` never runs**. The two diverge: Decimal `changeDue` + `422` on shortfall (orders) vs float `changeDue` + `409` + `upsert` (payments).
**Impact:** Maintenance hazard + inconsistent error contract; future refactors may silently swap behavior.
**Fix:** Delete one handler (keep the Decimal/422 one) and its route.

### H2 — Optimistic locking is non-atomic (TOCTOU) → lost updates across terminals
**`apps/api/src/orders/orders.service.ts:114-118`** reads `order.version`, compares to `dto.version`, then later `recomputeAndSave` does `version: { increment: 1 }` (`:455`) in a *separate* query. Two concurrent updates that both read version *N* both pass the check and both write — a lost update. The line replacement (`deleteMany` + `create` loop, `:131-157`) is also not wrapped in a transaction.
**Impact:** Violates PRD §16.2 / §7.4 (multi-terminal "409 + refresh, never a silent overwrite") — the core concurrency guarantee.
**Fix:** `updateMany({ where: { id, version: dto.version }, data: { version: { increment: 1 }, ... } })` and treat `count === 0` as `409`; wrap line replacement + recompute in `prisma.$transaction`.

### H3 — Single `refreshTokenHash` per user breaks multi-terminal login & triggers false "reuse" logouts
**`apps/api/src/auth/auth.service.ts:74-78, 88-113`** stores one refresh-token hash per user. A second device login overwrites it, invalidating the first device; then the first device's valid token is treated as a **reuse attack** and `refreshTokenHash` is nulled (`:98-101`), force-logging-out everyone.
**Impact:** Directly breaks the explicitly-required multi-terminal operation (PRD §7.4).
**Fix:** Store refresh tokens per-session/device (separate table keyed by a token `jti`); rotate/revoke individually.

### H4 — Customers module is entirely unimplemented (all routes 501)
**`apps/api/src/customers/customers.service.ts:11-29`** — `findAll/create/update/remove` all `throw new NotImplementedException(...)`. Controller + RBAC are wired, but the service is a stub.
**Impact:** Cashier cannot create/assign customers → cannot email receipts to a customer (PRD §9.9, §13.8). Core POS flow blocked.
**Fix:** Implement against `prisma.customer` (mirror products: paginated list + search, create, update, delete).

### H5 — Reports (5 endpoints) and KDS `/kds/tickets` double-wrap their responses
**`apps/api/src/reports/reports.service.ts:86,158,225,278,305`** and **`apps/api/src/kds/kds.service.ts:80-88`** return a plain `{ data, meta }` object. The global `ResponseInterceptor` then wraps it again → **`{ data: { data: ... } }`**. (Correct services return `new Paginated(...)`, which the interceptor handles once.)
**Impact:** Breaks the PRD §16.4 envelope for every report endpoint and the KDS ticket list; any typed client reads `undefined`.
**Fix:** Return the bare payload (or `new Paginated(items, meta)`); never hand the interceptor a pre-wrapped `{ data }`.

### H6 — KDS ticket list shows empty tickets for hidden-only orders and mis-filters
**`apps/api/src/kds/kds.service.ts:23-66`** — `showOnKds:true` is applied only inside `include.lines.where` (`:55-59`), not the order-level `where`. An order whose lines are all `showOnKds=false` still matches, is counted in `total`, and is returned as a ticket with `lines: []`. Also `if (categoryId)` (`:36`) **overwrites** the `if (productId)` filter (`:30`) when both are passed.
**Impact:** Violates PRD §7.6/§10 ("only `showOnKds` products appear"); wrong pagination counts; broken combined filters.
**Fix:** Move `lines.some({ product: { showOnKds: true, ...productId/categoryId } })` into the order-level `where` and AND-combine the filters.

### H7 — No rate limiting on auth endpoints
**`apps/api/src/main.ts`, `auth/*`** — no `@nestjs/throttler` / rate limiter anywhere. `/auth/login`, `/auth/signup`, `/auth/refresh` are open to brute-force / credential stuffing.
**Impact:** PRD §16.1 mandates rate-limiting auth endpoints.
**Fix:** Add `ThrottlerModule` + `ThrottlerGuard` (tight limit on the auth controller).

### H8 — Archived users stay authenticated until token expiry
**`apps/api/src/auth/strategies/jwt.strategy.ts:21-27`** (validate only checks `payload.sub`; explicit `TODO` at `:25`) and **`auth.service.ts:88`** (refresh doesn't check status). `login` filters `status:'ACTIVE'`, but nothing re-validates afterward.
**Impact:** Admin "archive" (= deactivate, PRD §8.7) has no effect for up to a full access-token lifetime; a valid refresh token keeps rotating for an archived user.
**Fix:** Load the user in `JwtStrategy.validate` and reject `status === ARCHIVED`; same check in `refresh`.

### H9 — Hardcoded JWT secret fallbacks in the verification strategies
**`apps/api/src/auth/strategies/jwt.strategy.ts:17`** (`?? 'dev-access-secret'`) and **`jwt-refresh.strategy.ts:23`** (`?? 'dev-refresh-secret'`). Signing has no such fallback, so a config-namespace mistake makes verification accept tokens signed with a publicly-known constant.
**Impact:** Token-forgery risk on misconfig (fails open, not closed) — PRD §16.1.
**Fix:** `config.getOrThrow('jwt.accessSecret')`; drop the `??` fallbacks.

### H10 — Socket.IO CORS reflects any origin with credentials
**`apps/api/src/realtime/realtime.gateway.ts:32-34`** — `cors: { origin: true, credentials: true }`. The REST side is restricted (`main.ts:20-21`), but the socket lets any website open an authenticated connection.
**Impact:** PRD §16.1 ("CORS restricted to the app origin(s)"); the disallowed reflect-any-origin + credentials combination.
**Fix:** Pass the configured `corsOrigins` to the gateway CORS.

### H11 — Floor delete hard-deletes tables referenced by historical orders → FK 500
**`apps/api/src/floors/floors.service.ts:107-140`** blocks only when a table has a non-`CANCELLED` order, then `table.deleteMany({ where: { floorId } })`. Tables referenced by `CANCELLED` orders (or missed cases) are hard-deleted; `Order.tableId` has no cascade → Prisma `P2003` → `500`. (Single-table delete in `tables.service.ts` correctly archives — floor delete is inconsistent.)
**Impact:** Data-integrity / 500; PRD §6 (archive, don't delete, referenced records).
**Fix:** Archive (`active:false`) tables that have any order; never hard-delete FK-referenced tables.

### H12 — Webhook signature compared with non-constant-time `!==`
**`apps/api/src/payments/payments.service.ts:246`** — `expectedSignature !== signature`. The verify path correctly uses `crypto.timingSafeEqual` (`:200-202`); the webhook path does not.
**Impact:** Timing side-channel on an HMAC (PRD §16.1).
**Fix:** Use `crypto.timingSafeEqual` on equal-length buffers (match the verify path).

---

## 4. 🟡 Medium

### M1 — Duplicate DRAFT orders per table
**`apps/api/src/orders/orders.service.ts:83-105`** — `create` never checks for an existing DRAFT on the table, so each call creates a new draft. PRD §7.4 says any cashier "may open an occupied table and **continue its order**" (reuse the existing draft).
**Fix:** If the table already has a DRAFT order, return/continue it instead of creating a second.

### M2 — `orders.create` picks an arbitrary open session
**`apps/api/src/orders/orders.controller.ts:44`** — `findFirst({ employeeId, status:'OPEN' })`. With multiple concurrent sessions (allowed, PRD §7.3), the order may be attributed to the wrong register/session.
**Fix:** Require/accept the active `registerId` (or sessionId) from the client and resolve the exact session.

### M3 — Razorpay payments always recorded as `type: CARD`, even for UPI
**`apps/api/src/payments/payments.service.ts:151,158,217`** hardcode `CARD`. UPI flows through the same endpoint (PRD §9.6) → mislabeled on the `Payment` record and the receipt (`:394`) and in reports.
**Fix:** Carry/derive the actual method (CARD vs UPI) and persist it.

### M4 — Reports use server-local / UTC time, not Asia/Kolkata
**`apps/api/src/reports/reports.service.ts:19-36, 148`** builds Today/Week/Month boundaries with `new Date(y,m,d)` (server TZ) and `date_trunc(... "createdAt")` (UTC). Timestamps are stored UTC (PRD §6/§16.3 → display Asia/Kolkata). On a UTC host, "Today" is off by 5h30m.
**Fix:** Compute boundaries and `date_trunc(... AT TIME ZONE 'Asia/Kolkata')`.

### M5 — Webhook 500s on a malformed `payment.captured` body
**`apps/api/src/payments/payments.service.ts:252-257`** — unguarded `payload.payload.payment.entity`. A captured event missing nested fields throws → 500 → Razorpay retries.
**Fix:** Defensive optional-chaining; return `200 {received:true}` for unhandled/malformed shapes.

### M6 — `validate-coupon` ignores `orderId` and returns no computed preview
**`apps/api/src/promotions/promotions.service.ts:99-119`** — returns raw `discountType`/`discountValue`, not the rupee preview PRD §13.6 requires (`{ code, orderId } → computed discount preview`).
**Fix:** Load the order subtotal/lines and run `PricingService.computeDiscountAmount`.

### M7 — Promotion `code` uniqueness only enforced for COUPON path
**`apps/api/src/promotions/promotions.service.ts:49`** — uniqueness is checked only when `type==='COUPON' && code`. An AUTOMATED promo created with a `code` set (DTO allows it) bypasses the check; `Promotion.code @unique` then throws `P2002` → 500.
**Fix:** Check uniqueness whenever `code` is present, or reject `code` on AUTOMATED.

### M8 — Bookings: no guest-or-customer validation, no overlap guard, fixed ±2h window
**`apps/api/src/bookings/dto/create-booking.dto.ts`** allows a booking with neither `customerId` nor `guestName` (PRD §8.8 requires one). `bookings.service.ts` never guards against double-booking a table; the "reserved" floor window is a hard-coded ±2h (`floors.service.ts:48-52`).
**Fix:** Cross-field `@ValidateIf` (customer OR guest); optional overlap check; document/justify the window.

### M9 — Catalog hard-delete of a DRAFT-referenced product/category → 500
**`apps/api/src/products/products.service.ts:70-84`, `categories/categories.service.ts:46-61`** — the "referenced" guard is `status: { not: 'DRAFT' }`, so a product/category referenced only by an open DRAFT is hard-deleted → `P2003` → 500 (and corrupts the in-progress cart).
**Fix:** Catch `P2003` → 409/422, or archive whenever any orderLine references it.

### M10 — ExportService launches Puppeteer at init without try/catch → can crash boot
**`apps/api/src/reports/export.service.ts:48-53`** launches Chromium in `onModuleInit` with no error handling (PaymentsService wraps its launch + lazy-loads). On a host without the bundled Chromium, the whole API fails to start.
**Fix:** Wrap in try/catch + lazy-init (or share one browser instance).

### M11 — Razorpay/SMTP secrets default to empty instead of failing fast
**`apps/api/src/config/env.validation.ts:60-92`, `configuration.ts`** — all integration secrets are `@IsOptional()` defaulting to `''`. This is the root enabler of C1/C2 and silent prod misconfig.
**Fix:** Require them (at least when `NODE_ENV=production`).

### M12 — Public self-signup creates a working CASHIER account
**`apps/api/src/auth/auth.controller.ts:17`, `auth.service.ts:44`** — `@Public() POST /auth/signup` unconditionally creates an active CASHIER. PRD §3/§8.1 says staff are created by Admin. Combined with H7 (no rate limit), it's an open account factory.
**Fix:** Gate signup behind Admin, or create accounts pending/inactive. Confirm intended behavior with PM.

### M13 — Frontend: refresh-on-401 dedup promise reset too early → spurious logout
**`apps/web/src/lib/api.ts:55-65`** — `refreshing = null` runs after the first awaiter resumes, so a near-simultaneous 401 can fire a **second** `/auth/refresh` using an already-rotated token → fails → `clear()` → user logged out mid-session.
**Fix:** Reset `refreshing` in a `.finally()` on the refresh promise, not after the first await.

### M14 — Frontend: socket never gets a token after login and never refreshes it
**`apps/web/src/lib/socket.ts:14-24`** — `getSocket()` reads the token once, lazily, and caches the singleton. If created pre-login it stays unauthenticated; after a token rotation it keeps the stale token. (Latent — no screen consumes the socket yet, but it breaks once realtime UI is built.)
**Fix:** Use the `auth: (cb) => cb({ token })` callback (re-invoked on reconnect) and `disconnectSocket()` on token change.

---

## 5. ⚪ Low / Informational

| # | Finding | Location |
|---|---|---|
| L1 | `payCash` uses `Number(order.total)` (float) for the shortfall comparison (changeDue itself is Decimal) | `orders/orders.service.ts:257` |
| L2 | `orders.findAll` search supports customer/number but **not date** (PRD §9.7) | `orders/orders.service.ts:33-41` |
| L3 | Prisma known errors (`P2002`/`P2025`/`P2003`) fall through to generic `500` instead of `409`/`404` (PRD §16.4) | `common/filters/all-exceptions.filter.ts` |
| L4 | `signup` duplicate-check is TOCTOU; concurrent dupes raise raw `P2002` → 500 instead of clean 409 | `auth/auth.service.ts:26-38` |
| L5 | Login/signup don't normalize email case (`Admin@x` ≠ `admin@x`) | `auth/auth.service.ts:55` |
| L6 | No "last admin" / self-archive lockout guard | `users/users.service.ts:86-119` |
| L7 | `open-session` duplicate-open check is a race (no partial unique index on employee+register where OPEN) | `sessions/sessions.service.ts:65-76` |
| L8 | `payment-methods.findAll` has no `active=true` filter for checkout (PRD §13.5) | `payment-methods/payment-methods.service.ts` |
| L9 | Tokens (incl. 7-day refresh) persisted to `localStorage` → XSS-exfiltratable (informational) | `web/src/stores/auth.store.ts` |
| L10 | `/signup` frontend route is a dead-end placeholder (no form, no POST) | `web/src/routes/Signup.tsx` |

---

## 6. ✅ Verified correct (not bugs)

- **Pricing engine** — matches PRD §7.1 exactly; worked example reproduced by hand (₹40×2 @5% + ₹250 @18% + 20% coupon → subtotal 330, discount 66, tax 39.20, **total 303.20**), plus 15/15 unit tests. Single-discount precedence (coupon > automated, largest auto wins), proportional per-line tax, half-up rounding, FIXED capped at subtotal — all correct. `orders/pricing.service.ts`.
- **RBAC hierarchy** — `RolesGuard` correctly treats `@Roles` as a minimum (ADMIN ⊇ CASHIER) and does **not** grant KITCHEN cashier access; KDS routes are `@Roles(KITCHEN, ADMIN)`; guard order is authenticate-then-authorize. `common/guards/roles.guard.ts`.
- **Global ValidationPipe** — `whitelist + forbidNonWhitelisted + transform` (PRD §16.1). `main.ts:24-31`.
- **Prisma schema vs PRD §6** — money `Decimal(10,2)`, qty `Decimal(10,3)`, `version` for optimistic lock, `orderNumber @unique`, FK + status/kdsStage/code indexes (§16.5). Added `refreshTokenHash` is acceptable.
- **Seed (PRD §17)** — 3 role users (hashed), 2 categories, 3 products (one `showOnKds=false`), Cash + UPI, 1 floor + 4 tables, 1 register; idempotent.
- **Session close** — rejects close with open DRAFT orders (422) and computes the closing summary from PAID orders with Decimal accumulation (PRD §7.3). `sessions/sessions.service.ts`.
- **Payment idempotency** — verify, webhook, and `markPaid` all short-circuit when already PAID (no double-mark). `payments.service.ts`, `orders.service.ts:298-300`.
- **Realtime** — handshake rejects missing/invalid token (`disconnect(true)`); room joins correct (ADMIN → both kitchen+floor); emit payloads match typed events. `realtime/realtime.gateway.ts`.
- **KDS stage machine** — `TO_COOK → PREPARING → COMPLETED` enforced (409 on illegal), emits updated/removed correctly. `kds/kds.service.ts:91-142`.
- **Frontend role→route map** — `/pos`→[ADMIN,CASHIER], `/admin`→[ADMIN], `/kds`→[KITCHEN,ADMIN]; no RoleGuard bypass or redirect loop; `types/index.ts` re-exports `@cafe-pos/types` (no duplication).
- **Build / lint / tests** — all green.

---

## 7. Implementation status

| Area | Status |
|---|---|
| Auth, Sessions, Registers, Pricing, Orders + lines + cash | ✅ Implemented |
| Categories, Products, Payment Methods, Promotions, Floors, Tables, Users, Bookings, KDS | ✅ Implemented |
| Payments (Razorpay create/verify/webhook), Receipts (PDF/email), Realtime, Reports + export | ✅ Implemented (see C1/C2/H-level issues) |
| **Customers** | ❌ **Stubbed — all routes 501 (H4)** |
| Frontend feature screens | ⚠️ Scaffold placeholders (only `Login` wired); plumbing (router/guards/api/socket) real |

---

## 8. Recommended remediation order

1. **C1, C2, M11** — close the payment-verification bypasses and require integration secrets (revenue integrity).
2. **H2, H3** — fix optimistic locking (atomic version check + transaction) and per-device refresh tokens (the two core multi-terminal guarantees).
3. **H5** — fix the reports/KDS double-wrap (every report + KDS client is currently broken).
4. **H1, H6, H4** — remove the duplicate cash route; fix KDS `showOnKds`/filters; implement Customers.
5. **H7–H12** — security hardening (rate-limit, archived-user revocation, drop secret fallbacks, restrict socket CORS, constant-time webhook compare, floor-delete archive).
6. **Medium/Low** — as scheduled.

---

*Generated by automated audit (build/lint/test + module-by-module source review against PRD_Cafe_POS.md). Every Critical and High finding was verified directly in source.*

---

# Remediation Log (fixes applied)

All findings were fixed and the result was re-verified. **Three additional double-wrap
bugs the original pass missed (floors / users / bookings list endpoints) were found
during fix-verification and also fixed.**

## Verification after fixes
| Check | Result |
|---|---|
| `pnpm build` (types → api → web) | ✅ pass |
| `pnpm lint` | ✅ 0 errors |
| `pnpm --filter @cafe-pos/api test` (pricing) | ✅ 15/15 |
| Migration `add_refresh_tokens` applied + seed | ✅ |
| Live boot + smoke tests | ✅ (see below) |

Live smoke tests (against a running instance): health ✓; login ✓; **login by UPPERCASE email** ✓ (L5); **device-1 refresh still valid after device-2 login** ✓ (H3 multi-terminal); reused rotated token → 401 ✓; unauth → 401 ✓; **kitchen→/users 403, kitchen→/kds 200** ✓ (RBAC); order create **reuses table's draft** ✓ (M1); pricing ₹60+18%→₹70.80 ✓; **stale-version PATCH → 409** ✓ (H2); **forged `order_mock_` verify → 400** ✓ (C1 closed); cash pay → PAID, re-pay → 422 ✓; **11th login → 429** ✓ (H7); customers create/list ✓ (H4); validate-coupon preview discount ₹6.00 ✓ (M6); floors/kds/customers responses single-wrapped ✓ (H5).

## Critical
- **C1** Razorpay verify bypass — `payments.service.ts`: mock vs real is now derived from the SERVER-stored `razorpayOrderId`, the submitted id must match it, and a real order ALWAYS verifies the HMAC (no skip). *Verified: forged `order_mock_` → 400.*
- **C2** Webhook bypass — `payments.service.ts`: refuses to mutate state when the webhook secret is unconfigured; signature now required + constant-time compared; defensive JSON parse.

## High
- **H1** Duplicate cash route — removed from `payments.controller.ts`/`payments.service.ts`; `OrdersController` is the single Decimal-based handler.
- **H2** Atomic optimistic lock — `orders.service.ts` `update()` wrapped in `$transaction` with a version-scoped `updateMany` guard (count 0 → 409). *Verified.*
- **H3** Per-device refresh tokens — new `RefreshToken` model (migration `add_refresh_tokens`); `auth.service.ts` rotates per-token with reuse-detection; multi-terminal no longer self-revokes. *Verified.*
- **H4** Customers implemented — `customers.service.ts` full CRUD + search. *Verified.*
- **H5** Response double-wrap — `reports.service.ts` (5 methods) + `kds.service.ts` return bare/`Paginated`. **Also fixed: `floors`, `users`, `bookings` list endpoints (newly found).**
- **H6** KDS filter/showOnKds — `kds.service.ts`: `showOnKds` enforced at order level; product/category filters compose.
- **H7** Auth rate-limiting — `@nestjs/throttler` global + tight `@Throttle` on login/signup/refresh. *Verified: 429.*
- **H8** Archived-user revocation — `jwt.strategy.ts` loads the user and rejects non-ACTIVE; `auth.refresh` re-checks status.
- **H9** JWT secret fallbacks removed — strategies use `config.getOrThrow` (fail-fast).
- **H10** Socket CORS — `realtime.gateway.ts` restricted to `CORS_ORIGINS` allowlist.
- **H11** Floor delete — `floors.service.ts` refuses (409) to delete a floor whose tables have any order history.
- **H12** Webhook constant-time compare — shared `safeSignatureEqual` (timing-safe).

## Medium
- **M1** Reuse table draft (`orders.create`) · **M2** session resolution kept (server picks the user's open session; documented) · **M3** UPI vs CARD recorded from `method` (`razorpay-verify.dto.ts`) · **M4** reports in Asia/Kolkata (boundaries + `date_trunc ... AT TIME ZONE`) · **M5** webhook malformed-body guard · **M6** validate-coupon returns computed preview · **M7** promotion `code` uniqueness for any type + P2002 backstop · **M8** booking guest-or-customer `@ValidateIf` + explicit `reservedAt` Date mapping · **M9** catalog hard-delete of ANY-status-referenced product/category now archives · **M10** `export.service.ts` Puppeteer launch wrapped + lazy · **M11** prod env requires integration secrets · **M12** public signup kept per PRD §13.1, mitigated by H7 rate-limit · **M13** `web/lib/api.ts` refresh promise resets in `.finally()` · **M14** `web/lib/socket.ts` reads token per (re)connect + reconnects on token change.

## Low
- **L1** `payCash` Decimal compare · **L2** orders search-by-date · **L3** Prisma errors → 409/404 in the filter · **L4** signup P2002 → 409 · **L5** case-insensitive email login + lowercase storage · **L6** last-active-admin lockout guard (`users.service.ts`) · **L7** open-session race — kept app-level 409 (DB partial-unique left as future hardening) · **L8** `payment-methods` `active` filter · **L9** localStorage tokens — kept (reload UX); proper fix = httpOnly cookies, deferred · **L10** Signup screen remains a labelled scaffold placeholder (frontend is intentionally scaffold).

> Note: the frontend remains a scaffold (only Login is wired); the two frontend fixes (M13/M14) harden the shared API/socket plumbing for when feature screens are built.
