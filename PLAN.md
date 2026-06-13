# PLAN.md — Backend Dev 1: Core & Data

> **Project:** Cafe / Restaurant POS System
> **Lane:** Backend Engineer 1 — Core & Data
> **Source of Truth:** `PRD_Cafe_POS.md` + `02_backend_dev1_prompt.md`
> **Base Repo:** `cafe-pos/` (pnpm monorepo — NestJS + Prisma + PostgreSQL)

---

## Current Trajectory

> **✅ All 6 Phases Complete** — Build passes, 15/15 pricing tests green

---

## Master Roadmap

| # | Phase | Status | Depends On |
|---|-------|--------|------------|
| 1 | Schema → Migrate → Seed | ✅ Done | — |
| 2 | Auth + RBAC | ✅ Done | Phase 1 |
| 3 | Registers + Sessions | ✅ Done | Phase 2 |
| 4 | Pricing Engine | ✅ Done (15/15 tests) | Phase 1 |
| 5 | Core CRUD (Categories, Products, PaymentMethods, Promotions) | ✅ Done | Phase 2 |
| 6 | Orders + Order Lines + Cash Payment | ✅ Done | Phase 3, 4, 5 |

---

## Phase 1 — Schema → Migrate → Seed

Add `refreshTokenHash String?` to User model for JWT rotation. Audit all 14 models against PRD §6. Run migration + seed. Verify demo data: 3 users (Admin/Cashier/Kitchen), 2 categories, 3 products (1 showOnKds=false), Cash+UPI, 1 floor+4 tables, 1 register.

## Phase 2 — Auth + RBAC

Signup, login (email OR username), refresh with rotation, logout, `/auth/me`. DTOs with class-validator. JwtStrategy via Passport. Global JwtAuthGuard + @Public(). RolesGuard + @Roles(). @CurrentUser() decorator. Verify Cashier → Admin route = 403.

## Phase 3 — Registers + Sessions

GET/POST registers. Open session (one per employee+register). GET current session + last-session info. Close session: reject if DRAFT orders (422), compute closing summary (count + total of PAID orders).

## Phase 4 — Pricing Engine (highest priority)

Pure service, no DB access. Decimal only. Algorithm: lineTotals → subtotal → single discount (coupon > auto, largest wins) → proportional tax per line rate → total. **Worked example must match: Tea ₹40×2 @5% + Burger ₹250×1 @18% + 20% coupon = ₹303.20**. Full unit test suite required.

## Phase 5 — Core CRUD

Categories, Products, Payment Methods, Promotions. Paginated+search lists. Admin writes, Cashier+ reads. Soft-delete/archive when referenced by non-draft orders. Conditional DTO validation (upiId for UPI, promotion type rules).

## Phase 6 — Orders + Order Lines + Cash Payment

Create DRAFT under session. Update lines with optimistic locking (version→409). Snapshot product data. Recompute via pricing engine. Apply/clear coupon. Send to kitchen (kdsStage + realtime seam). Cash payment (changeDue). markPaid() exposed for Dev 2. State machine: PAID/CANCELLED immutable (422).

---

## Squad Status

| Agent | Task | Status |
|-------|------|--------|
| Backend Dev 1 | Phase 1–6 | ✅ Complete |
| Backend Dev 2 | Socket.IO / Razorpay / Receipts / CRUD | ⏳ Separate lane |
| Frontend Dev | App shell / Auth / POS / KDS | ⏳ Separate lane |
