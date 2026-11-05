# E3 overlay interaction checklist · E4 exploratory charters

Phase 1 fix round, 2026-11-04, production build on `http://127.0.0.1:3200`. "Auto" means an assertion
in the named spec runs in Chromium, Firefox and WebKit (`e2e/header.spec.ts`, 19 tests × 3 engines).
"Manual" means only a scripted Playwright session watched by the agent; no human device testing.

## E3 Overlay checklist

| Check | Mega menu | Search | Account | Mini-cart | Drawer | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Opens by mouse / tap / keyboard | hover intent, click (touch), ArrowDown | button, Enter | button | button | button | Auto: "opens on hover…", "is keyboard operable…", "is an APG combobox…", "offers sign in…", "shows the empty state…", "drills down…" |
| Hover intent: no flicker on a quick pass | ✓ | n/a | n/a | n/a | n/a | Auto: "a quick pass over the nav does not open a panel" |
| One panel at a time; outside click closes | ✓ | modal | ✓ | modal | modal | Auto: "keeps one panel open at a time…" |
| Escape closes and returns focus to the trigger | ✓ | ✓ | ✓ | ✓ | ✓ | Auto: keyboard, mini-cart and drawer tests |
| Focus trap / inert page while modal | n/a (disclosure) | ✓ | n/a (popover) | ✓ (header inert) | ✓ | Auto: mini-cart dialog test; axe on every open state (`e2e/a11y.spec.ts`) |
| Closes on route change and browser Back | ✓ | ✓ | ✓ | ✓ | ✓ | Auto: "…closes on outside click and navigation", "closes on the browser Back button…", "follows a link and closes" |
| Layering above page content | ✓ | ✓ | ✓ | ✓ | ✓ | Auto: "the open panel and its backdrop sit above the page" (BUG-005) |
| Scroll inside long panels, page locked | `max-h-below-header` + overscroll-contain | full-screen sheet on phones | short | lines scroll | levels scroll | Overflow audit open states (`e2e/overflow-audit.spec.ts`) |
| No horizontal overflow at 320–1920 and 200 % zoom | ✓ | ✓ | ✓ | ✓ | ✓ | `e2e/overflow-audit.spec.ts` (634 combinations) |
| Works without JavaScript | links navigate | `/search` GET form | link to sign-in | link to `/cart` | n/a (links in footer) | Auto: "header controls are links and /search works with a GET form" (BUG-008) |
| Reduced motion | fades gated by `motion-safe` | ✓ | ✓ | transform only | ✓ | Code review + all suites run with `reducedMotion: "reduce"` |
| States: empty / typing / loading / no results / offline | n/a | ✓ all | signed out / in | empty / lines | levels | Auto: search tests (recent, did-you-mean, offline + retry); mini-cart empty → lines |
| Touch target ≥ 44 px on phones | n/a < lg | ✓ | ✓ | ✓ | ✓ (`size-11`) | axe `target-size` (WCAG 2.2) on all routes/panels |

## E4 Exploratory charters (time-boxed, scripted sessions)

| Charter | Findings |
| --- | --- |
| Explore the header with keyboard only at 1440 to find focus loss | BUG-007 (panel switch dropped focus); fixed |
| Explore the drawer on a phone to find focus and level-navigation problems | BUG-011 (focus fell back to the popup); fixed |
| Explore every page at 320 px and 200 % zoom to find sideways scrolling | BUG-012, BUG-013, BUG-014; fixed |
| Explore the store in WebKit over HTTP to find engine-specific breakage | BUG-009 (CSP upgrade), BUG-010 (Secure cookies); fixed. Thin Inter on WebKit/Windows: engine limitation (`qa/bugs.md`) |
| Explore abuse of public endpoints (rate limits, forged headers, cross-site posts) | BUG-015 (forged `X-Forwarded-For` bypassed limits); fixed. CSRF/401 checks in `e2e/security.spec.ts` |
| Explore page weight on a throttled phone | BUG-016 (image optimiser served originals); fixed. PERF-01, PERF-02 open |
| Explore slow phones navigating right after load | No loss; 1.4–3.5 s at 6× CPU (`qa/nav-race.mjs`), phase-2 build item 11 |
| Explore repeated purchases of one size | Correct "sold out" handling; product pages may show stock up to 60 s old (by design, `caching.md`) |
