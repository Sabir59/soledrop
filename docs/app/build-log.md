# Build log

## Phase 0 — Design gathering: blocked
Source: plugin (not reachable)     Figma file: Soledrop (key unknown) · exported — · rev 0
Captured: 0 tokens · 0 text styles · 0 components · 0 screens · 0 light / 0 dark screenshots · 0 taps · 0 icons · 0 photos · 0 illustrations
Gate: ✗ blocked: no `design/` export. The agent session (2026-11-03) exposed no Figma executor tools (`figma_*`), and the file guard refuses access to `figma-ai-executor/`.
Warnings: —
Gaps: the whole design.
Intake: components.md ✗ · screens.md ✗ · build-plan.md ✗ · theme generated ✗ · theme check ✗ (all blocked: no design export)
Decisions made:
- Did not start application code. The session also had no shell (no pnpm, next build, tests, Playwright, Supabase CLI or git), so no stage could reach "Done when:" or be verified/committed. Writing unverified code would break the "never mark green without running" rule.
Needs from you:
- Expose the Figma AI Bridge Executor tools (Soledrop (Local) plugin) to the agent session, or attach a `design/` export (handoff §4).
- Run the agent with a shell tool (PowerShell/Bash) enabled so it can install, build, test and commit locally.
- Figma file key/link for docs/app/design-source.md.
Continuing: none. Resume at Phase 0 when the above is available.

## 2026-11-03/04 — Phase 0 unblocked, Stages 1–7
Source: Figma plugin (Soledrop (Local)), read only; screens, tokens, icons and photos exported into `design/`. Owner frames were not modified.
Built (details in design-decisions D-001…D-036 and journey-audit J-01…J-25):
- Storefront: home, listing, pre-loved, product pages (new/pre-loved), contact, FAQs, size guide, bag (empty/filled), search, content pages, 404/500.
- Commerce: checkout (COD, bank transfer, Stripe reference adapter behind a flag), atomic idempotent orders, order page/lookup/cancel/returns, accounts (register, sign-in, reset, addresses, export, erasure).
- Data seam: `server/<domain>` with fixtures and Supabase repositories selected by `DATA_DRIVER`.
- Database: `supabase/migrations` (42 tables, RLS deny by default, SECURITY DEFINER staff-role pair with `search_path=''`, all RPCs), and `supabase/seed.sql` generated from the fixtures.
- Platform: outbox + signed webhooks, flags, rate limits, idempotency, audit, `/api/health`, `/api/ready`, `/api/jobs/*`, `/api/v1` + OpenAPI, CSV import/export, B2B price list behind a flag.
- Hardening:
  - `next.config.ts`: standalone output, CSP without nonces (D-033), HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP.
  - `instrumentation.ts`: production exits on an invalid environment; JSON error logs carry digests.
  - Bank transfer is hidden in production until real details are set.
  - Products and content pages use ISR, with real 404/307 statuses; `loading.tsx` only where safe.
- Hand-off: `.env.example` (checked by a test), Dockerfile, `.dockerignore`, `supabase/config.toml`, `docs/DEPLOYMENT-RUNBOOK.md`, `docs/app/{phase-2,data-model,api,caching,events}.md`.
Verified (production build unless noted):
- tsc ✓; eslint (0 warnings) ✓.
- vitest 70/70 ✓: RPC/contention 26, RLS 8, seed 2, unit/architecture/integration 34.
- `next build` ✓ (47 routes).
- Checkout journey and page smoke in Chromium under the CSP, with no CSP violations ✓.
- axe WCAG 2.2 AA: 0 violations on 16 routes × 1920/390 ✓.
Not green:
- Pixel QA fails on every screen. Photos (PX-01) and glyphs (PX-02) are not proven; the residue is in PX-04. See `qa/defects.md`.
- Pending: geometry audit, device matrix, WebKit/Firefox.
Blocked:
- No Docker, Supabase CLI or Postgres server, so `supabase start`/`db reset` and parallel-connection lock tests can't run. PGlite serialises calls.
- No git commit (session policy).
