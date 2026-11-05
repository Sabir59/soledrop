# Phase 2: open decisions and scope

Phase 1 delivered the storefront, the commerce engine, the database layer (migrations, RLS, functions,
seed) and service adapters, all running locally. Phase 2 is everything that needs a hosted account,
the owner's input or a staff UI. Each item has a recommendation.

## Decisions for the owner

| # | Decision | Recommendation |
| --- | --- | --- |
| P2-01 | **Hosting** for the container | A managed container host near Pakistan (e.g. a Singapore/Mumbai region) with the Dockerfile as is. Put a CDN in front for `/_next/static` and ISR pages. |
| P2-02 | **Supabase project** region and plan | Pro plan (point-in-time recovery) in the region closest to the app. Run `supabase db push` from a trusted machine (runbook §3). |
| P2-03 | **Domain and sender email** | Verify the domain in Resend; `EMAIL_FROM=Sole Drop <orders@<domain>>`. |
| P2-04 | **One support email** (D-023): `Soledropofficial@gmail.com` vs `soledrop@gmail.com` | Use a domain address once P2-03 exists; until then keep the footer's. |
| P2-05 | **Support hours** (D-024) | Set `siteConfig.contact.supportHours`; the Contact box shows them automatically. |
| P2-06 | **Bank-transfer account** | Set `BANK_NAME`, `BANK_ACCOUNT_TITLE` and `BANK_IBAN`; until then bank transfer is hidden in production. |
| P2-07 | **Card payments** | Start with COD + bank transfer. Turn on Stripe (or a local PSP via a new adapter in `server/adapters/payments`) when the business has a merchant account; Stripe availability in Pakistan needs a foreign entity. |
| P2-08 | **Photo policy for pixel QA** (PX-01) | Accept geometry-only verification for photos; keep `next/image` optimisation. |
| P2-09 | **Women's and Kids' size charts** (D-026) | Replace the standard conversions in `content/size-guide.ts` with the brands' charts. |
| P2-10 | **Legal pages** (privacy, terms, returns) | Have a lawyer review `server/fixtures/content-seed.ts` text before launch. |
| P2-11 | **Real photography** | Replace `public/images` with owned photos; keep the card/gallery roles (D-016). |
| P2-12 | **Theme collection in Figma** | Add a Figma variable collection named Theme so `scripts/check-design.mjs` gate G3 passes. |
| P2-13 | **CSP hardening** (D-033) | Move to `experimental.sri` (hash-based `script-src 'self'`) once stable in Next; keep static rendering. |
| P2-14 | **Promotion eligibility at entry** (J-20) | Re-check per-customer limits once the email is typed, so the code is refused before Place order. |

## Build in phase 2

1. **Admin UI** (staff auth via Supabase Auth; the RLS roles and audit log already exist): catalogue
   and stock editor, order desk (transition/payment/refund/return use the existing `/api/v1`
   operations), promotions, pages/FAQs, flags, import/export screens. Saves call `revalidatePath`
   (`caching.md`).
2. **Low-stock alerts**: an `inventory.low` event when available stock crosses a threshold. The topic
   was removed from phase 1 because nothing emitted it.
3. **Courier integration** (TCS / Leopards / PostEx): a provider registry like payments, driving
   `shipped`/`delivered` with tracking numbers via `transition`.
4. **Refunds through the provider**: Stripe refunds API from `create_refund` (today the money is
   returned in the provider dashboard and recorded here).
5. **Scheduler**: wire the three `/api/jobs/*` endpoints (runbook §5).
6. **Observability**: ship the JSON logs to a log service; alert on `fatal` lines, outbox `failed`
   events and `/api/ready` 503s.
7. **Parallel-connection concurrency test** against a real Postgres (the PGlite tests serialise calls;
   see the final report).
8. **Visual QA completion**: real-device matrix and macOS/iOS Safari (the geometry audit and the
   Playwright WebKit/Firefox runs were done in the Phase 1 fix round, `qa/defects.md`).
9. **Overlay open responsiveness** (PERF-01, `qa/bugs.md`): opening the drawer or search costs
   248–432 ms INP at 4× CPU. Profile Base UI's focus manager and scroll lock, open on `pointerdown`,
   and defer non-critical panel content with `startTransition`.
10. **Shared JavaScript** (PERF-02): 290 KB gzip first load against a 200 KB budget. Move client
    schemas to `zod/mini` (31 KB of zod reaches every route via the footer newsletter form) and read
    public env without zod in the browser.
11. **Pending-navigation indicator** for slow phones: client navigations take 1.4–3.5 s at 6× CPU
    (`qa/nav-race.mjs`); show a top progress bar after ~300 ms.
12. **Wishlist**: no saved-items control exists in the design (D-040); add it with the account area
    if the owner wants it.
13. **Header nav sub-pixel spacing** (GEO-01): once a designer confirms, size each top-level trigger
    to its Figma text-box width.

## Not doing

Native apps, marketplace sellers, multi-language content (the i18n plumbing exists; English only
until there's demand), loyalty points.
