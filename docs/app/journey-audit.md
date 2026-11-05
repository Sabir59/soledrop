# Journey audit

Each journey walked end to end against the screens. Status: ✓ works as designed · fixed (see decision) · open.

| ID | Journey | Finding | Resolution |
| --- | --- | --- | --- |
| J-01 | Home → New shoes / Pre-loved | Hero CTAs need destinations. | New shoes → `/collections/brand-new`, Pre-loved → `/pre-loved`. ✓ |
| J-02 | Home → category cards | Whole card is the link; "Explore" is its visual affordance. | ✓ |
| J-03 | Card → add to bag without a size | Design shows ADD TO CART and size chips together; pressing add with no size would have to guess. | "Choose a size first" status + focus moves to the first available size. fixed |
| J-04 | Card → condition info (pre-loved) | The ⓘ on the condition chip had no target. | Links to `/condition-guide` (D-047). fixed |
| J-05 | Listing → filter → back | Filters must survive reload/share and undo with Back. | Filters, sort, view and page live in the URL; each change is a history entry. ✓ |
| J-06 | Listing → filters that match nothing | No designed state. | Empty state with "Clear filters". fixed (D-013) |
| J-07 | Listing on a phone | 368 px sidebar cannot sit beside the grid. | Below `lg` the sidebar folds behind a "Filters (n)" button above the results. fixed |
| J-08 | Listing → price | Single-thumb slider (D-011). | Upper-limit semantics, value announced via `aria-valuetext`. fixed |
| J-09 | Brand filter search with no match | No designed state. | "No brands match …" status. fixed |
| J-10 | Product page → condition ⓘ (pre-loved) | The ⓘ had no target; leaving the page to learn a grade breaks the purchase. | Modal with the five grades, this pair's highlighted, link to the full guide. fixed (D-017) |
| J-11 | Product page → BUY NOW | Not designed beyond the button. | Adds the selected pair, then opens checkout; without a size both buttons ask for one. fixed (D-019) |
| J-12 | Contact → send | Only the filled form is drawn. | Inline errors under each field, focus to the first invalid one, confirmation naming the reply address; honeypot + rate limit server-side. fixed (D-022) |
| J-13 | Footer → FAQ | The FAQ screen body is empty — a dead end. | Questions by topic with jump links, then a route to Contact. fixed (D-025) |
| J-14 | Size Guide → Women / Kids | Tabs drawn, only the men's chart exists. | Working ARIA tabs; standard charts for the other two, flagged for the owner. fixed (D-026) |
| J-15 | Bag → change quantity / remove | Not specified. | Server re-prices on every change; changes are announced; after Remove, focus moves to the next line's Remove (or the empty-bag heading). Pre-loved lines have no stepper (one of a kind). fixed (D-028) |
| J-16 | Bag → line sold out meanwhile | No designed state. | Line marked "Sold out — remove it to check out", warning banner, checkout button withheld until resolved. fixed (D-028) |
| J-17 | Bag → empty | Designed (09). | Both shop entrances; removing the last line lands focus on the heading. ✓ |
| J-18 | Bag → Proceed to Checkout | Pointed at a page that did not exist. | Checkout page (D-030); an empty bag redirects to the bag's empty state. fixed |
| J-19 | Checkout → submit with gaps | Not designed. | Message under each field, focus on the first, summary line under the button. Verified in Chromium. fixed |
| J-20 | Checkout → one-per-customer code used again | The code is accepted in the summary (email unknown yet) and refused at Place order. | The refusal names the promotion; the shopper removes the code and places the order. Open item for phase 2: re-check eligibility once the email is entered. open |
| J-21 | Checkout → double click / retried request | Risk of two orders. | One idempotency key per visit; the server replays the first order. fixed |
| J-22 | Checkout → prepaid-only delivery with COD chosen | COD would be refused by the server. | COD option disables with a reason and the choice lapses. fixed |
| J-23 | Order placed → confirmation | Not designed. | Order page with next step, progress, items, totals; bank transfer shows account details and reference. fixed |
| J-24 | Order → cancel | Irreversible. | Second confirmation with focus on "Keep order"; status announced; stock released on the server. fixed |
| J-25 | Guest → find an order later | Not designed. | Order lookup (number + email) with one message for any mismatch; rate limited. fixed |
