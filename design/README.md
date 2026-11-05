# Design reference — Soledrop (revision 1)
Exported 2026-11-03 from "Soledrop (Local)" (key etqAFD01BgUZGgUPOLrYeh), page "Main Design" › section "Main Flow", with the Figma AI Bridge Executor plugin (protocol 2, bridge `http://localhost:8787/command`). The light desktop frames are the source of truth.
What changed since revision 0: first export.

| Folder | What's inside | Use it for |
|---|---|---|
| `spec/tokens.light.json` | Variable collections — **empty** (the file has no variables) | — (tokens are derived, see Notes) |
| `spec/typography.json` | Text/effect/grid styles — **empty** (the file has no styles) | — |
| `spec/components.json` | Component sets — **empty** (the file has no components; every repeat is a detached copy) | — |
| `spec/screens-01-07.json`, `screens-08-10.json` | Each screen as a compact node tree (`GET_SCREEN_TREE`) | structure |
| `spec/geometry/*.json` | Each screen with **every property** (`GET_DOCUMENT_STATE detail:full`): absolute x/y, fills, strokes, radii, effects, text metrics and styled segments | exact numbers, geometry audit |
| `spec/outline/*.txt` | Generated, readable one-line-per-node digest of `geometry/` (`node scripts/design-outline.mjs`) | building from numbers |
| `spec/prototype.json` | Prototype wiring — **no reactions** in the file | — |
| `spec/icons.json` + `icons/*.svg` | 22 custom vector icons/logo exported as SVG | `components/icons` |
| `photos/*` + `photos.json` | 33 original image fills (deduplicated by hash), with display size, scale mode and where used | `public/photos` |
| `screens/light/desktop/NN *.png` | 10 screenshots at 1×, 1920 px wide | pixel QA |

## Screens (all 1920 px, desktop, light)
01 Home Page (2117:75) · 02 Inside pages = product listing (2087:71) · 03 Pre Loved page (2103:257) · 04 Frame 195 = product, brand new (2276:30) · 05 Frame 194 = product, pre-loved (2256:5) · 06 Contact Us (2103:862) · 07 FAQs (2103:866) · 08 Size Guide (2103:865) · 09 Empty Cart page (2338:331) · 10 Cart page (2338:427).

Not exported as screens (canvas leftovers, not frames of the flow): "Frame 126" ×2 (50 % black placeholders), loose reference images (`image 155/156/164/166/167/170/171/172/174`, "ChatGPT Image…", "Sneaker Condition Guide Modal (1) 1"), and the frames outside the section ("Soledrop 4/5/6", "Box Sie", "Group"). The "Sneaker Condition Guide Modal" image is used as the reference for the condition-info dialog (see docs/app/design-decisions.md).

## Notes
- **No tokens, no styles, no components, no prototype, no icon library.** Every value is raw. Tokens are derived from the measured values (`node scripts/design-analyse.mjs`) and recorded in `docs/app/design-tokens.md`; the theme is generated from that file.
- **Single breakpoint, single theme.** Only 1920 px light frames exist. Tablet/mobile/dark are derived (documented in docs/app/screens.md); they have no screenshot to diff.
- **Raster text.** "Why Sole Drop" on Home (`image 148`, `image 149`) and the "Sneaker Condition Guide" on Pre Loved are bitmaps with text baked in. They are rendered as images with a full text alternative.
- **Hidden duplicates.** Home "Frame 189" (Pre-Loved Drops cards) sits fully under "Frame 191" (New Arrival) and is not visible; "Frame 110" contains a newsletter block positioned where the visible one is. Only visible layers are built.
- **Copy errors in the design**, kept as text-of-record but corrected in the build and logged in docs/app/design-decisions.md: "SEND A MASSAGE", "Massage", "FOLLOW USE ON INSTAGRAM", "Stay Update", "@Soledropoffical", price format "PKR 28.999" (dot vs comma), cart subtotal arithmetic.
- Fonts: Inter (Medium/Semi Bold/Bold/Extra Bold/Black, Regular) and Montserrat (Medium/SemiBold/Bold/ExtraBold).

## Regenerating
`node scripts/design-export-spec.mjs` · `node scripts/design-import-screens.mjs` (after `figma_export_node` 1× of each screen) · `node scripts/design-export-photos.mjs` · `node scripts/design-export-icons.mjs` · `node scripts/design-outline.mjs`, then `node scripts/generate-theme.mjs`.
