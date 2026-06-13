# Cafe POS — End-to-End Audit Report

**Target:** `OdooCafePOS/` monorepo (NestJS + Prisma + Postgres API, React/Vite web, shared `@cafe-pos/types`)
**Branch:** `version-1`
**Date:** 2026-06-13
**Method:** Objective build / lint / typecheck / test runs on the *current* tree + module-by-module source review. Every finding carries a `file:line` and was verified directly in source.

> ⚠️ **This report supersedes the in-repo `AUDIT_REPORT.md`.** That document describes an earlier state ("foundation scaffold", "all builds/lint/tests pass"). Since then the **frontend was built out** (≈5,500 lines of real screens) and several previously-"fixed" plumbing items **regressed**. The claims in `AUDIT_REPORT.md` and `README.md` are now **stale and inaccurate** — see F0.

---

## 1. Objective checks (run on current tree)

| Check | Result | Notes |
|---|---|---|
| `pnpm --filter @cafe-pos/types build` | ✅ pass | |
| `pnpm --filter @cafe-pos/api build` | ⚠️ blocked | `prisma generate` hit a Windows `EPERM` (engine DLL locked by a running `node` dev process). **Not a code error** — `tsc -p tsconfig.json --noEmit` compiles clean. |
| API typecheck (`tsc --noEmit`) | ✅ pass | |
| **`pnpm --filter @cafe-pos/web build`** | ❌ **FAIL** | 2× `TS2339: Property 'sentToKitchenAt' does not exist on type 'KdsTicket'` — see **F1**. The web app cannot be production-built. |
| **`pnpm lint`** (workspace) | ❌ **FAIL** | web: **1 error** (`prefer-const`) + 28 warnings; api: clean — see **F2**. |
| `pnpm --filter @cafe-pos/api test` | ✅ 15/15 | Only the pricing engine has tests; every other module is untested — see **F12**. |

### Findings by severity

| Severity | Count |
|---|---|
| 🔴 Blocker (app won't build / core flow dead) | 3 |
| 🟠 High (a user flow is broken at runtime) | 5 |
| 🟡 Medium | 6 |
| ⚪ Low / Informational | 6 |

> **Backend note:** the security/payment fixes claimed in `AUDIT_REPORT.md` (Razorpay verify/webhook hardening, atomic optimistic lock, per-device refresh tokens, restricted socket CORS, rate-limiting, Prisma error mapping) **are present and correct in this branch.** The backend is in good shape. The breakage is concentrated in the **frontend ↔ API contract** and the **build/lint gates**.

---

## 2. 🔴 Blockers

### F1 — Web build is broken: KDS references a field that doesn't exist (and the feature is non-functional)
**`apps/web/src/routes/kds/Kds.tsx:412,414`**
```tsx
className={`... ${getTimerStyle(ticket.sentToKitchenAt)}`}>
  <span>{getElapsedTime(ticket.sentToKitchenAt)}</span>
```
`KdsTicket` (`packages/types/src/index.ts:126`) has only `{ orderId, orderNumber, stage, lines }` — **no `sentToKitchenAt`**. This is a hard `tsc` error, so **`pnpm build` for web fails entirely**.

It is also a **runtime feature bug** even if you silence the type: the backend KDS ticket builders (`apps/api/src/kds/kds.service.ts:68-78, 121-131, 171-181`) and the send-to-kitchen emitter (`apps/api/src/orders/orders.service.ts:285-295`) **never include `sentToKitchenAt`** in the ticket payload — even though the column *is* stored on the order (`orders.service.ts:274`). So the KDS "preparation timer" badge would always render against `undefined`.
**Fix:** add `sentToKitchenAt: string` to `KdsTicket`, populate it in all four ticket-building sites (`o.sentToKitchenAt?.toISOString()`), then the frontend compiles and the timer works.

### F2 — Lint gate fails (blocks any `pnpm lint`-gated CI)
**`apps/web/src/routes/pos/OrderView.tsx:205`** — `'updatedLines' is never reassigned. Use 'const'` (`prefer-const`, **error**).
Plus 28 warnings (mostly `@typescript-eslint/no-explicit-any` and `react-hooks/exhaustive-deps`). One ESLint **error** is enough to make `pnpm lint` exit non-zero.
**Fix:** `let updatedLines` → `const updatedLines` (it's only mutated by index/`push`, never reassigned). Address the `any`s and effect-deps as cleanup (F11).

### F3 — POS session landing never detects an open session → cashier can get stuck
**`apps/web/src/routes/pos/SessionLanding.tsx:49-55`**
```ts
const res = await api.get<CurrentSessionResponse>('/sessions/current');
const data = res.data;                 // axios body = { data: {...} }  ← envelope!
setCurrentSession(data.currentSession);// → undefined, ALWAYS
```
Every API response is wrapped by the global interceptor as `{ data, meta? }` (`apps/api/src/common/interceptors/response.interceptor.ts`). `/sessions/current` returns `{ currentSession, lastSessionDate, lastClosingSale }` (`sessions.service.ts:44-48`), so the real payload is at `res.data.data`. Reading `res.data.currentSession` is **always `undefined`** → the landing always shows the "open a session" form even when a session is already open. Re-opening the same register then returns `409 "You already have an open session"` (`sessions.service.ts:72`), so the cashier cannot reach the floor through the landing.
**Fix:** `const data = res.data.data;` (this file already does the correct thing for `/registers` two lines later).

---

## 3. 🟠 High — broken runtime flows

### F4 — Cash payment confirmation breaks the order state (envelope bug)
**`apps/web/src/routes/pos/OrderView.tsx:482-484`**
```ts
const resData = res.data;             // { data: { order, cashReceived, changeDue } }
setOrder(resData.order);              // → undefined  (state nuked)
setChangeDue(parseFloat(resData.changeDue)); // → NaN  ("Change: ₹NaN")
```
`POST /orders/:id/pay/cash` returns `{ order, cashReceived, changeDue }` (`orders.service.ts:347-351`), wrapped → real data at `res.data.data`. After a *successful* cash payment the order object becomes `undefined` and the change-due display shows `NaN`.
**Fix:** `const resData = res.data.data;`

### F5 — Razorpay / UPI / Card checkout is launched with undefined parameters (envelope bug)
**`apps/web/src/routes/pos/OrderView.tsx:412-421`**
```ts
const res = await api.post(`/orders/${order.id}/pay/razorpay/create`);
const { razorpayOrderId, amount, currency, keyId } = res.data; // all undefined
...
const options = { key: keyId, amount, currency, order_id: razorpayOrderId, ... };
new (window as any).Razorpay(options); // opens with key/amount/order_id = undefined
```
`razorpayCreate` returns `{ razorpayOrderId, keyId, amount, currency }` (`payments.service.ts:128-133`), wrapped → real data at `res.data.data`. The Razorpay Checkout modal therefore opens with `key: undefined`, `amount: undefined`, `order_id: undefined` → the entire UPI/Card payment path is non-functional.
**Fix:** `const { razorpayOrderId, amount, currency, keyId } = res.data.data;`

### F6 — Closing a session reports a false failure (envelope bug)
**`apps/web/src/routes/pos/SessionLanding.tsx:101-106`**
```ts
const res = await api.post(`/sessions/${currentSession.id}/close`);
const { summary } = res.data;          // undefined
setSummaryData({ orderCount: summary.orderCount, ... }); // TypeError → catch
```
`close()` returns `{ session, summary }` (`sessions.service.ts:133-139`), wrapped → `res.data.data.summary`. Reading `res.data.summary` is `undefined`; `summary.orderCount` throws, which is caught and surfaced as **"Failed to close session"** — even though the session **was** closed server-side. User sees an error on a successful close and never sees the closing summary.
**Fix:** `const { summary } = res.data.data;`

### F7 — POS "Orders" list and "Order Detail" are unimplemented placeholders, but routed & linked
**`apps/web/src/routes/pos/Orders.tsx`** (10 lines) and **`OrderDetail.tsx`** (12 lines) both render `<Placeholder>`. They are wired into the router (`router.tsx:41-42`) under `/pos/orders` and `/pos/orders/:orderId` (PRD §9.7). A cashier navigating there gets a "coming soon" stub — the order-history / re-open-paid-order flow does not exist on the frontend (the backend endpoints `GET /orders` and `GET /orders/:id` do).
**Fix:** implement the list (paginated, search by customer/number/date — backend already supports all three, `orders.service.ts:37-53`) and the detail view.

### F8 — Realtime socket uses a stale/empty token → KDS & floor live-updates silently die
**`apps/web/src/lib/socket.ts:14-24`** caches the Socket.IO singleton and snapshots the access token **once** into a static `auth: { token }` object.
- If `getSocket()` is ever called before login, the socket stays unauthenticated (the gateway `disconnect(true)`s it — `realtime.gateway.ts:71-73, 87-90`).
- The access token has a **15-minute TTL** (`.env` `JWT_ACCESS_TTL=15m`). After a refresh the singleton keeps the **old** token; on any reconnect Socket.IO re-sends the stale token → `jwt.verify` rejects it → the connection is dropped and **never recovers**. KDS tickets (`Kds.tsx:78-94`) and table/order status (`TableView.tsx:53-74`) stop updating after ~15 min.
**Fix:** use the callback form `auth: (cb) => cb({ token: \`Bearer ${currentToken}\` })` (re-invoked on every reconnect) and `disconnectSocket()` on token change so a fresh handshake uses the new token.

---

## 4. 🟡 Medium

### F9 — Refresh-on-401 dedup resets too early → spurious double-refresh / logout
**`apps/web/src/lib/api.ts:55-57`**
```ts
refreshing = refreshing ?? refreshAccessToken();
const newToken = await refreshing;
refreshing = null;   // ← runs after the FIRST awaiter resumes
```
Two near-simultaneous 401s: the first resolves and sets `refreshing = null`; a second 401 arriving immediately after fires a **second** `/auth/refresh` with an already-rotated (now-invalid) refresh token → the server's reuse-detection revokes the token family → the user is logged out mid-session.
**Fix:** reset in a `.finally()` on the promise, not after the first `await`.

### F10 — JWT secrets have no minimum-strength validation
**`apps/api/src/config/env.validation.ts:38-44`** requires the secrets to be non-empty but not strong. The shipped `.env` uses `JWT_ACCESS_SECRET=change-me-access-secret`. Production secrets *are* required (`:114-130`), but a weak/guessable secret passes validation.
**Fix:** enforce a `@MinLength(32)` (or entropy check) on the JWT secrets, at least when `NODE_ENV=production`.

### F11 — Pervasive `any` and effect-dependency smells in the web app (28 lint warnings)
`syncTimeoutRef = useRef<any>` (`OrderView.tsx:107`), `(window as any).Razorpay`, untyped axios generics, and several `react-hooks/exhaustive-deps` warnings (`OrderView.tsx:149`, `Reports.tsx:144`, `Customers.tsx:70`). The missing-deps ones are latent staleness bugs (effects capturing old `order`/`navigate`).
**Fix:** type the refs/handlers; wrap the fetchers in `useCallback` or move them into the effect.

### F12 — No test coverage outside the pricing engine
Only `pricing.service.spec.ts` exists (15 tests). Auth, orders (optimistic lock), payments (the verify/webhook hardening), KDS, sessions, reports — none are tested. The high-risk concurrency and payment-integrity logic has no regression net; the four envelope bugs above (F3–F6) would have been caught by a single integration test per flow.
**Fix:** add controller/e2e tests for the order→pay→receipt and session open/close flows.

### F13 — Migration history hygiene: two migrations named `_init`
**`apps/api/prisma/migrations/`** contains `20260613090340_init` (full schema, 353 lines) **and** `20260613093921_init` (a 2-line `ALTER TABLE … ADD refreshTokenHash`). The second is mislabeled `init`; `refreshTokenHash` is then dropped again by `..._add_refresh_tokens`. The net schema is coherent (verified), but the column was added and removed across migrations and the naming is misleading for anyone reading history.
**Fix:** cosmetic — squash before a real release; no action needed for the DB state.

### F14 — README & in-repo AUDIT_REPORT are inaccurate (F0 context)
`README.md:9` calls the project a "foundation scaffold … business logic intentionally not implemented" with placeholder pages and `NotImplementedException` handlers. In reality the backend is fully implemented and the frontend has real screens (Login, OrderView 1116 lines, Reports 519, Kds 480, Bookings 467, Products 397, Users 331, Customers 402, etc.). `AUDIT_REPORT.md` claims web build + lint pass — both currently fail (F1, F2). Onboarding off these docs will mislead.
**Fix:** refresh both docs to the current state.

---

## 5. ⚪ Low / Informational

| # | Finding | Location |
|---|---|---|
| L1 | Tokens (incl. 7-day refresh) persisted to `localStorage` → XSS-exfiltratable. Acceptable for this app stage; httpOnly cookies are the hardened option. | `apps/web/src/stores/auth.store.ts:36` |
| L2 | `OrderView` debounced sync closes over `order.version` captured at edit time; a sync in-flight during a rapid second edit can submit a stale version → 409 → forced refresh (self-heals, but causes a visible "updated by another terminal" flash on single-user fast entry). | `OrderView.tsx:152-199` |
| L3 | One leftover `// TODO` in a DTO. | `apps/api/src/payment-methods/dto/create-payment-method.dto.ts` |
| L4 | MSW is wired but `handlers` is empty with `onUnhandledRequest:'bypass'` — harmless, but means the web app has **no** offline/dev fallback; every screen needs a live API + DB to render data. | `apps/web/src/mocks/handlers.ts` |
| L5 | `orders.create` resolves the cashier's session via `findFirst({ status:'OPEN' })` — with multiple concurrent open sessions the order may attach to the wrong register. | `apps/api/src/orders/orders.controller.ts:44-50` |
| L6 | Booking-driven `RESERVED` table status uses a hard-coded ±2h window. | `apps/api/src/orders/orders.service.ts:392-397` |

---

## 6. Implementation status (current)

| Area | Status |
|---|---|
| **API** — auth (per-device refresh), sessions, registers, pricing, orders + atomic lock, cash + Razorpay (hardened), receipts, realtime, reports, KDS, all CRUD | ✅ Implemented & sound |
| **Web** — Login, Signup, POS OrderView, TableView, SessionLanding, Customers, all Admin screens, KDS, Reports | ⚠️ Implemented but **does not build** (F1) and several flows broken at runtime (F3–F6, F8) |
| **Web** — POS Orders list, Order Detail | ❌ Placeholder stubs (F7) |
| Docs (README, AUDIT_REPORT) | ❌ Stale / inaccurate (F14) |

---

## 7. Recommended remediation order

1. **F1 + F2** — unblock the build and lint gate (add `sentToKitchenAt` to `KdsTicket` + populate it; `let`→`const`). Nothing ships until web builds.
2. **F3, F4, F5, F6** — the four `res.data` → `res.data.data` envelope bugs. These break the *core POS money flows*: session open/close and both payment paths. One-line fixes each; add one integration test per flow (F12).
3. **F8, F9** — realtime stale-token and refresh-dedup (the two long-session stability bugs).
4. **F7** — implement the POS Orders list + Order Detail screens.
5. **F10–F14 / L1–L6** — hardening, tests, docs, cleanup.

---

*Generated by an independent end-to-end audit (objective build/lint/typecheck/test on the current tree + full source review). Every Blocker/High finding was reproduced and traced to a `file:line`.*

---

# Remediation Log (fixes applied)

All findings F1–F14 were addressed and re-verified. Objective gates after fixes:

| Check | Result |
|---|---|
| `pnpm --filter @cafe-pos/web build` (tsc + vite) | ✅ pass |
| `pnpm lint` (workspace) | ✅ **0 errors, 0 warnings** |
| API typecheck (`tsc --noEmit`) | ✅ pass |
| `pnpm --filter @cafe-pos/api test` | ✅ pass (pricing + new envelope/session/KDS specs) |

### Blockers
- **F1** — Added `sentToKitchenAt: string | null` to `KdsTicket` (`packages/types`); populated it in all KDS ticket builders (`kds.service.ts` ×3, `orders.service.ts` send-to-kitchen). KDS prep timer now compiles and renders real elapsed time.
- **F2** — `let updatedLines` → `const` (`OrderView.tsx`).
- **F3** — Session landing reads `res.data.data.currentSession` (typed `SuccessEnvelope<CurrentSessionResponse>`).

### High
- **F4** — Cash payment reads `res.data?.data ?? res.data` → real `{ order, changeDue }`.
- **F5** — Razorpay create reads `res.data?.data ?? res.data` → real `{ razorpayOrderId, amount, currency, keyId }`.
- **F6** — Session close reads `res.data?.data ?? res.data` → real `{ summary }`.
- **F7** — Implemented POS **Orders** list (session-scoped, paginated, search by number/customer/date) and **Order Detail** (line items + totals; DRAFT → Edit/Cancel, PAID/CANCELLED → view-only).
- **F8** — Socket handshake uses the callback `auth` form + reconnects on token rotation (`socket.ts`) — realtime survives the 15-min access-token TTL.

### Medium / Low
- **F9** — Refresh-on-401 dedup promise resets in `.finally()` (`api.ts`).
- **F10** — JWT secrets require ≥32 chars in production (`env.validation.ts`).
- **F11** — All 28 lint warnings cleared: shared `getApiErrorMessage` helper (`lib/errors.ts`) replaces `catch (err: any)`; typed Razorpay interop (`types/razorpay.ts`); `useRef`/`payload`/forEach/formatter typed; effect deps fixed via `useCallback`.
- **F12** — Added regression tests: `response.interceptor.spec.ts` (envelope contract that F3–F6 violated), `sessions.service.spec.ts` (getCurrent/close shapes), `kds.service.spec.ts` (`sentToKitchenAt` presence).
- **F14** — `README.md` status updated; points to this report and flags `AUDIT_REPORT.md` as superseded.
- **F13** — **Intentionally not changed.** The mislabeled `..._init` migration is already applied; renaming an applied migration breaks Prisma's checksum/history integrity. The net schema is correct. Squash only as part of a deliberate pre-release migration reset on a fresh database.
