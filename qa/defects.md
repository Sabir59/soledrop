# Pixel QA defects

Run: `node qa/pixel.mjs --base=http://127.0.0.1:3200` against the standalone production build
(`next build`, `node qa/serve.mjs 3200`), Chromium, 1920 px, DPR 1, reduced motion, pixelmatch
`threshold: 0`, `includeAA: false`, **no masks**. Date: 2026-11-04 (Phase 1 fix round, after BUG-016).
Raw numbers: `qa/out/results.json`.

**Gate status: FAIL.** No screen is pixel-exact. Heights match on 9 of 10 screens (07 differs by
design, D-025). The gate has not been loosened; the breakdown below is diagnostic only.

Classification is computed by `qa/pixel.mjs` from the DOM at capture time: *photo* = inside an
`<img>` box, *glyph* = inside a rendered text run (±1 px), *other* = everything else.

| Screen | Route | Δh | Mismatched | photo | glyph | other |
| --- | --- | --- | --- | --- | --- | --- |
| 01 Home | `/` | 0 | 3,567,470 (23.6 %) | 3,352,940 | 135,416 | 79,114 |
| 02 Listing | `/collections/new-arrivals?gender=men` | 0 | 959,695 (14.4 %) | 897,446 | 39,976 | 22,273 |
| 03 Pre-Loved | `/pre-loved?gender=men` | 0 | 2,003,609 (24.8 %) | 1,256,094 | 245,301 | 502,214 |
| 04 Product (new) | `/products/asics-gel-kayano-30-black-silver` | 0 | 728,166 (10.5 %) | 692,818 | 29,787 | 5,561 |
| 05 Product (pre-loved) | `/products/hoka-bondi-7-grey` | 0 | 813,635 (11.4 %) | 735,730 | 46,905 | 31,000 |
| 06 Contact | `/contact` | 0 | 81,437 (2.0 %) | 0 | 28,776 | 52,661 |
| 07 FAQs | `/faq` | +747 | 2,767,621 (52.5 %) | 0 | 260,858 | 2,506,763 |
| 08 Size Guide | `/size-guide` | 0 | 33,523 (0.7 %) | 0 | 25,589 | 7,934 |
| 09 Empty bag | `/cart` | 0 | 29,023 (0.8 %) | 0 | 19,853 | 9,170 |
| 10 Bag | `/cart` (2 lines) | 0 | 162,356 (4.2 %) | 121,301 | 33,292 | 7,763 |

Change since the earlier run today: the header with mega menus, account panel, mini-cart and search
(closed state) and the mobile footer/contact/empty-bag fixes left screens 06–09 at exactly the
same counts as the run before BUG-016. Photo counts moved only because photos are now really
optimised (BUG-016).

## PX-01 Photos never match (open; needs a decision)
Correction: before BUG-016 the standalone build served the **original** files (sharp failed to load),
so earlier photo mismatches came from the browser resampling originals into smaller boxes. Now
`next/image` serves AVIF/WebP at q75, resized to the rendered width. Neither can equal the design PNG's
pixels. Photo geometry (size and position) is covered by the geometry audit. Serving original PNGs to
match pixels would mean multi-MB pages, and was **not** done. Recommendation: accept, and verify photos
by geometry only (phase-2.md P2-08).

## PX-02 Glyph rasterisation (open; not proven AA-only)
Every text run differs at glyph edges: Chromium's rasteriser vs Figma's export, with identical fonts
and sizes. pixelmatch's AA detector does not classify these as anti-aliasing (they're counted red).
They are **not yet proven** AA-only per the brief: the proof (per-glyph offset analysis) was not run.

## PX-03 Documented design decisions (expected, not defects)
Most *other* pixels fall where a recorded decision deliberately changes what is drawn:
- **01, 06, 09, 10:** AA colour replacements, e.g. control border `#949494` for `#a3a3a3` (D-004).
- **03:** Condition Guide rebuilt from a raster as text (D-015). It also covers the filter labels (D-015), the brand list rhythm (D-010), the single-thumb price filter (D-011) and the view toggle (D-014).
- **06:** copy fixes "Message", follow line and button (D-022); one email address (D-023).
- **07:** FAQ body content on a designed-empty page (D-025), so the +747 px height is expected.
- **01:** Why Sole Drop rebuilt as text (D-003).
- **Prices:** comma grouping (D-001).

## PX-04 Unattributed residue (open)
Some *other* pixels on 01, 02, 05, 08, 09 and 10 (5–80 k per screen) are not yet traced to a
decision. They include card/shadow edges and stroke edges (outline strokes, D-008, tuned to
1.37/1.89 px). Status: **open**.

## Geometry audit (run 2026-11-04, `node qa/geometry.mjs`, tolerance 0.01 px, `qa/out/geometry.json`)
Text runs matched to design nodes per screen: 01 110/168 (exact 19, ≤ 0.5 px 24, ≤ 2 px 45, > 2 px 22) ·
02 111/143 · 03 93/140 · 04 77/125 · 05 63/86 · 06 35/48 · 07 24/32 · 08 77/88 · 09 23/31 · 10 33/57.
Exit status: **FAIL** (not every matched run is within 0.01 px). Main > 2 px groups:
- **03:** the filter column sits 151–203 px higher than in the design (D-010 / D-015 rebuilt filters).
- **07:** footer +747 px (D-025 FAQ content).
- **08:** the size-guide tabs matched to header nav labels of the same name (matcher ambiguity, not a shift).
- **Every screen:** the announcement text is 6.84 px wider (emoji glyph from the system font) and the
  header nav labels are off by −0.92…+1.39 px (GEO-01 in `qa/bugs.md`).

## Not run
- Real-device matrix; Safari on macOS/iOS (Playwright WebKit on Windows only).
