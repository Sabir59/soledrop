# 📐 Layout, Spacing & Responsive Styling Contract

**Role:** You are a Lead Frontend Architect keeping layout code consistent, responsive and direction-safe across every browser and viewport this web app ships to — from a 360 px phone to a wide desktop — with Tailwind CSS v4 utilities and the design tokens generated from Figma.

## 1. Flexbox & Grid Supremacy (The Gap-First Mandate)

i. **Gap over margins:** all spacing between sibling elements MUST come from the parent's `gap-{size}` on a `flex`/`flex-col`/`flex-row`/`grid` container. Components never set their own outer spacing.
ii. **Absolute ban on physical margins:** forbidden on child components: `ml-*`, `mr-*`, `mt-*`, `mb-*`, `mx-*`, `my-*`, `m-*`. Also forbidden: `space-x-*` and `space-y-*` (they are margin-based) — use `gap`.
iii. **Exception protocol:** if `gap`/padding genuinely can't express the spacing, stop and explain why in a comment before reaching for a margin. In rare approved cases, only logical margins (`ms-*`/`me-*`) are permitted.
iv. **The one sanctioned centring idiom:** page-width centring (`mx-auto`) lives in exactly one place — `components/shared/container.tsx`. Features and other components centre with `flex justify-center` / `grid place-items-center` or are centred by the `Container` they sit in.
v. **Padding for inside space** uses the generated layout tokens (`px-page-x`, `py-section`…) or the standard scale, never arbitrary values.

## 2. RTL & Internationalization Safety

Direction on the web is a **document attribute**, not a reload: the root layout sets `<html lang={locale} dir={dir}>` from the active locale, and the whole tree flips.

i. **Direction-agnostic layouts:** `gap` and flex/grid direction flip automatically with `dir` — don't special-case RTL with conditional styles.
ii. **No hard-coded left/right:** never use physical direction utilities. Use the logical equivalents everywhere:

| ❌ Physical | ✅ Logical |
|---|---|
| `left-*` / `right-*` | `start-*` / `end-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `ml-*` / `mr-*` | `ms-*` / `me-*` (see §1.iii) |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `border-l` / `border-r` | `border-s` / `border-e` |
| `rounded-l*` / `rounded-r*` (and `rounded-tl/tr/bl/br`) | `rounded-s*` / `rounded-e*` (and `rounded-ss/se/es/ee`) |
| `float-left` / `float-right` | `float-start` / `float-end` |

iii. **Directional icons mirror in RTL** (chevrons, arrows, "back"): add `rtl:rotate-180` (or `rtl:-scale-x-100`) on the icon. Icons that carry meaning independent of reading direction (play, search, a clock) never mirror.
iv. **Radix components get the direction too:** wrap the app in Radix's `DirectionProvider` with the active `dir` so menus, sliders and tabs behave correctly.
v. **Scripts that are always RTL** (Arabic scripture, Hebrew quotes) carry their own `dir="rtl"` and `lang` on the element, whatever the UI language is, so mixed-direction pages render correctly.
vi. **Numbers, URLs and code stay LTR** inside RTL text — wrap them in an element with `dir="ltr"` or use `<bdi>`.

## 3. Responsive Layout (Mobile-First)

i. **Mobile-first utilities:** write the base (smallest) layout unprefixed, then add `sm:`, `md:`, `lg:`, `xl:`, `2xl:` overrides upward. Never write `max-*:` overrides to undo a desktop layout.
ii. **The design's frames set the breakpoints.** The Figma handoff names the design widths (typically mobile 390 / tablet 768 / desktop 1440). Map each to the nearest Tailwind breakpoint once, in `docs/app/`, and use only those. Between designed widths the layout is fluid; beyond the widest it is capped by `Container`.
iii. **Width caps** come from `components/shared/container.tsx` (`max-w-*` per breakpoint + page padding token). Don't scatter `max-w-[1200px]`.
iv. **Component-level responsiveness** uses container queries (`@container` on the wrapper, `@md:` on children) when a component's layout depends on the slot it sits in rather than the viewport (cards in a sidebar vs a main column).
v. **Viewport units:** use `min-h-dvh` / `h-dvh`, not `h-screen`, so mobile browser chrome doesn't clip content. For iOS notch/home-bar on fixed bars, set `viewport-fit=cover` and pad with `env(safe-area-inset-*)` inside that one shared component.
vi. **Grid for two-dimensional layout, flex for one-dimensional.** Don't fake columns with percentage widths.
vii. **No horizontal page scroll at any width ≥ 320 px.** Long strings get `min-w-0` + `truncate`/`break-words`; tables get an `overflow-x-auto` wrapper.
viii. **Images:** `next/image` with explicit `width`/`height` or `fill` + `sizes`; art-direction swaps use `<picture>` or breakpoint-conditional components, not CSS `display:none` duplicates of heavy media.

## 4. Pure Container Flow

i. Components must be "good neighbours" — they never dictate their own external spacing. External layout spacing is exclusively controlled by the parent's `gap`.
ii. **Browser-only styling goes through variants, not forks:** `hover:`, `focus-visible:`, `supports-[…]:`, `motion-reduce:`, `print:` are written directly in the class list.
iii. **Stacking:** no arbitrary `z-[9999]`. Use a small named scale defined once in the theme (`z-nav`, `z-overlay`, `z-toast`).

## 5. Layout Execution Checklist

- **Step 1:** Wrap sibling components in a `flex`/`flex-col`/`flex-row` (or `grid`) parent container.
- **Step 2:** Set spacing strictly on the parent via `gap-{size}`; page padding from layout tokens.
- **Step 3:** Use logical properties (`start-`/`end-`/`ps-`/`pe-`/`ms-`/`me-`/`text-start`) for every directional class, never `left-`/`right-`.
- **Step 4:** Build the smallest viewport first, then add breakpoint overrides upward; check each designed width.
- **Step 5:** Verify zero physical margin/direction utilities and zero `space-x/y` exist in any child `className` — the architecture test does this for you ([verification-contract.md](./verification-contract.md)).
