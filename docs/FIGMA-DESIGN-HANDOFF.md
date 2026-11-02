# 🎨 Figma → Code Handoff (universal, web)

How design work moves from a Figma file into this codebase, for **any** project on this stack. The build agent never opens Figma. It reads a committed, machine-readable snapshot in `design/` — the full design specification as JSON (tokens, text styles, every component with every variant, every screen as a node tree, every prototype tap) plus screenshots and assets — and compiles it into the theme and components.

## 1. Principles

1. **Figma is the source of truth for look.** Product behaviour, scope and copy rules live in `docs/app/`. Code structure lives in the contracts. See the order of authority in [ARCHITECTURE.md](./ARCHITECTURE.md).
2. **The spec beats the screenshot.** Numbers, tokens, text and component props come from `design/spec/*.json`. Screenshots show what "done" looks like. If they disagree, follow the spec and record the difference in the final report.
3. **Everything is a token.** A raw hex, a raw pixel gap or an unbound font in the spec means the layer wasn't tokenized — map it to the nearest token and report it. Never put a hex or a magic number in code.
4. **Build exactly what's there.** No extra screens, tabs, settings, animations or "improvements". A missing state or edge case → build the simplest version consistent with the design and list it under *Decisions made*.
5. **Same names everywhere.** A Figma component, variant property and icon keeps its name in code (see [shadcn contract](./shadcn-component-contract.md) §2.iii).
6. **Regenerate, never hand-copy.** Theme files are generated from the export and checked in CI; they are not edited by hand.

## 2. The Pipeline

```
Figma file ──export──▶ design/ (committed) ──generate──▶ styles/tokens.generated.css
   ▲                        │                                   │
   │ designer fixes         ├──read──▶ components & screens built (docs/app/components.md, screens.md)
   │                        └──compare──▶ screenshots vs running app, light + dark, each designed width
   └──── re-export ◀────────── differences / questions in the final report
```

## 3. Preparing the Figma File (designer checklist)

A clean export needs a disciplined file. Before exporting:

**Variables**
- [ ] Collections: **Primitives** (raw palette), **Theme** (semantic roles that alias primitives), **Spacing & Radius**, **Typography** (font families), **Layout** (page padding, section gaps, card padding — aliasing spacing). Add *Breakpoints* if the design uses them.
- [ ] Theme role names match the code roles exactly — at minimum the shadcn base set: `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring` (+ `chart-1…5` / `sidebar-*` if used, + product roles like `success`, `highlight`).
- [ ] **Light and Dark** exist for every Theme role — as two modes of the Theme collection, or as two files. Same role names in both.
- [ ] Every variable has its **code syntax** (Web) filled in, e.g. `var(--background)`, `var(--color-green-50)`, `calc(var(--spacing) * 4)`, `var(--font-sans)`. The exporter copies it into the JSON `code` field.
- [ ] Spacing/radius names use `_` for a decimal point (`spacing/1_5` = 1.5 steps).

**Styles**
- [ ] Text styles named `group/size` (`display/lg`, `title/md`, `body/sm`, `overline`) with a description line `Code: text-title-md`. Font family, weight, size, line height, letter-spacing and case are all set on the style.
- [ ] Effect styles named `shadow/sm|md|lg`, with the CSS value in the description.
- [ ] Layout grid styles per breakpoint (`layout/mobile`, `layout/tablet`, `layout/desktop`) with columns, gutter and margin.

**Components**
- [ ] One Figma component set per code component, **PascalCase, same name as the code export** (`Button`, `FormField`, `PricingCard`).
- [ ] Variant properties are named like code props and use code values: `variant`, `size`, `state`, `selected`, `disabled`, `type`.
- [ ] Every interaction state is a variant: `default · hover · focus · pressed · disabled · loading`, plus `selected`/`expanded`/`error` where relevant. (No hover state designed → the builder uses the shadcn default derived from tokens and records it.)
- [ ] Optional parts are **boolean** properties (`showIcon`), labels are **text** properties, icons are **instance-swap** properties.
- [ ] A description line states the intended usage: `Code: <Button variant size>`.

**Screens**
- [ ] Frame names: `NN CODE Name` (e.g. `04 H02 Pricing`) — `NN` is flow order, `CODE` an area letter + number. When a screen is designed at several widths, name each frame `NN CODE Name · Mobile|Tablet|Desktop`, one frame per width per theme.
- [ ] Auto Layout everywhere; resizing set deliberately (Fixed / Hug / Fill). Absolute positioning only for deliberate overlays and decoration.
- [ ] Prototype flows named (`1 · Onboarding`); every tap wired (navigation, overlay open/close, variant change, back). Overlays (dialogs, sheets, menus) are their own frames or component variants.
- [ ] Real copy, not lorem ipsum. Sample user data (names, dates, counts) is labelled as such in the layer name (`Sample · note text`).
- [ ] Icons are components named `icon/<lucide-name>` (`icon/arrow-right`). Custom icons are flagged.
- [ ] Image fills are named and at least @2× the largest size they're shown at.
- [ ] No hidden junk: delete unused layers, detached styles and stray `opacity: 0` layers (or name them `Hidden · …` on purpose).

## 4. The Export — the `design/` Contract

The export is produced in **Phase 0** by your local plugin (MCP only as a fallback) and certified by `node scripts/check-design.mjs` before development starts — procedure and gate in [DESIGN-GATHERING.md](./DESIGN-GATHERING.md).

### 4.1 Folder layout

```
design/
├── README.md                 file key, export date/tool, what changed, notes, deviations (template in §4.4)
├── spec/
│   ├── tokens.light.json     every variable, every collection (+ tokens.dark.json, or a Dark mode inside)
│   ├── typography.json       text styles, effect styles (shadows), grid styles
│   ├── tokens.json           GENERATED: light + dark value of every Theme role (for tests)
│   ├── components.json       every component, every variant, props, full node tree
│   ├── screens-NN-MM.json    screens as node trees, chunked by number range
│   ├── prototype.json        flows + every tap per screen + per component variant
│   └── icons.json            icon/<name> → lucide-react component
├── screens/
│   ├── light/<breakpoint>/NN <Figma name>.png     1× screenshots (breakpoint folder omitted if the project has one width)
│   └── dark/<breakpoint>/NN <Figma name>.png
├── illustrations/*.svg       exported vector art
├── photos/<name>@2x.jpg|@3x.jpg  + photos.json   image fills with sizes and where each is used
└── icons/*.svg               custom (non-lucide) icons only
```

### 4.2 What each exporter command produces

The Figma AI Bridge Executor commands used so far, and the file each one feeds. Any other exporter (Figma's own MCP server, a plugin, the REST API) is fine **if it writes the same file shapes** — the build agent only reads `design/`.

| Command | Produces |
|---|---|
| `GET_VARIABLES` | `spec/tokens.light.json` (+ dark): collections → modes → variables with `type`, `value`, `alias`, `code`, `description` |
| `GET_STYLES` | `spec/typography.json`: `textStyles`, `effectStyles`, `gridStyles` |
| `GET_COMPONENT_TREE` | `spec/components.json`: every component, props, every variant's node tree |
| `GET_SCREEN_TREE` | `spec/screens-*.json`: every screen frame as a node tree (chunked) |
| `GET_PROTOTYPE` | `spec/prototype.json`: flows, per-screen taps, per-component interactions |
| `GET_ICON_COMPONENTS` | `spec/icons.json`: Figma icon component → `lucide-react` name, `custom` flag |
| `EXPORT_NODE` | `screens/**/*.png` (1×) and `illustrations/*.svg`, custom `icons/*.svg` |
| `FIND_IMAGE_FILLS` + `GET_IMAGE_BYTES` | `photos/*` and `photos/photos.json` |

### 4.3 Export prompt (paste into the Figma executor)

```text
Export the Figma file "<FILE NAME>" (key <FILE KEY>) for a code build. Write ONLY these files, in exactly the
shapes in docs/FIGMA-DESIGN-HANDOFF.md §5. Do not summarise, abbreviate or skip nodes.
1. GET_VARIABLES  → design/spec/tokens.light.json (and tokens.dark.json if Dark is a separate file): every collection,
   mode and variable with type, resolved value, alias, Web code syntax and description.
2. GET_STYLES     → design/spec/typography.json (textStyles, effectStyles, gridStyles).
3. GET_COMPONENT_TREE → design/spec/components.json: every component set, every variant, props with defaults/options,
   full node tree per variant (layout, sizing, token-bound fill/stroke/radius/effect, nested instances + overrides).
4. GET_SCREEN_TREE → design/spec/screens-NN-MM.json (≤ 7 screens per file), each screen with originalName and
   breakpoint (mobile|tablet|desktop) where the frame name has a "· Breakpoint" suffix.
5. GET_PROTOTYPE  → design/spec/prototype.json: flows, every interaction per screen (on, trigger, action, to,
   transition) and componentInteractions.
6. GET_ICON_COMPONENTS → design/spec/icons.json (figma name, lucide component, custom flag).
7. EXPORT_NODE    → every screen as design/screens/<light|dark>/<breakpoint>/NN <name>.png at 1×; every illustration
   as SVG into design/illustrations/; custom icons into design/icons/.
8. FIND_IMAGE_FILLS + GET_IMAGE_BYTES → design/photos/<name>@2x.jpg and @3x.jpg + photos.json.
Report: counts per file, any node you could not export, any layer bound to a raw value instead of a variable.
```

### 4.4 `design/README.md` (the exporter writes it; template)

```md
# Design reference — <Product> (revision N)
Exported <date> from "<File name>" (key <key>) with <tool>. The <light|…> file is the source of truth.
What changed since revision N-1: docs/app/revision-N.md
| Folder | What's inside | Use it for |   ← the table in §4.1
## Notes
- Approved deviations (e.g. a contrast fix that is now in Figma), TEMP values (e.g. dark roles copied from the nearest role),
  glyphs/fonts that render differently in Figma, anything the builder must know.
## Regenerating
Re-export with the commands in docs/FIGMA-DESIGN-HANDOFF.md §4.2, then run `node scripts/generate-theme.mjs`. `--check` (part of verify) fails when the theme is out of date.
```

## 5. Spec Format Reference

All files carry `section`, `file` (Figma file name) and `exportedWith`.

### 5.1 Tokens — `tokens.<theme>.json`

```jsonc
{ "collections": {
    "Primitives": { "modes": ["Default"], "variables": {
        "green/900": { "type": "color", "value": "#163a2d", "code": "var(--color-green-900)" } } },
    "Theme": { "modes": ["Light"], "variables": {
        "primary":   { "type": "color", "alias": "green/900", "value": "#163a2d", "code": "var(--primary)" } } },
    "Spacing & Radius": { "variables": { "spacing/4": { "type": "float", "value": 16, "code": "calc(var(--spacing) * 4)" } } },
    "Typography":       { "variables": { "font/body": { "type": "string", "value": "Jost", "code": "var(--font-sans)" } } },
    "Layout":           { "variables": { "page/padding-x": { "type": "float", "alias": "spacing/5", "value": 20,
                           "code": "calc(var(--spacing) * 5)", "description": "Tailwind: px-5" } } } } }
```

`alias` is the variable it points to. Theme roles are the semantic tokens used in code. In a separate Dark file the **same Theme role names hold the dark values**. `tokens.json` (generated) holds `roles: { <role>: { light: {alias, hex}, dark: {alias, hex} } }`.

### 5.2 Styles — `typography.json`

- `textStyles[]`: `name` (`title/lg`), `family`, `weight`, `size`, `lineHeight`, `letterSpacing` (`"12%"`), `textCase` (`UPPER|ORIGINAL…`), `fontVariable`, `description` (with the `Code:` hint).
- `effectStyles[]`: `name` (`shadow/md`), `description`, `effects[]` (`type: DROP_SHADOW`, `x`, `y`, `blur`, `spread`, `color` as 8-digit hex).
- `gridStyles[]`: `name` (`layout/desktop`), `grids[]` (`pattern: COLUMNS`, `count`, `gutterSize`, `offset`, `alignment`).

### 5.3 Components — `components.json`

```jsonc
{ "components": [ { "name": "Button", "description": "… Code: <Button variant size>",
    "props": { "label":   { "type": "text", "default": "Continue" },
               "variant": { "type": "variant", "default": "default", "options": ["default","outline","ghost"] },
               "showIcon":{ "type": "boolean", "default": false },
               "icon":    { "type": "instance_swap", "default": "icon/arrow-right" } },
    "variants": [ { "variant": "variant=default, size=lg", "tree": { /* node */ } } ] } ] }
```

Prop `type` is one of `text`, `variant`, `boolean`, `instance_swap`. Each variant carries a full node tree.

### 5.4 Screens — `screens-NN-MM.json`

`{ "range": [1, 7], "screens": [ { "name": "01 O01 Welcome", "originalName": "O01 Welcome", "breakpoint": "desktop", "tree": <node> } ] }` — `breakpoint` is present only when a screen is designed at several widths.

### 5.5 The node (used by components and screens)

| Field | Meaning |
|---|---|
| `n` · `t` | layer name · type: `frame`, `instance`, `text`, `component`, `rectangle`, `vector`, `ellipse` |
| `w` · `h` | size on the design canvas in px. **Reference only** — not a CSS instruction (see §6) |
| `layout` | Auto Layout: `dir` (`row`\|`col`), `gap`, `pad` = `[top, right, bottom, left]`, `main` (primary-axis alignment: `MIN`\|`CENTER`\|`MAX`\|`SPACE_BETWEEN`), `cross` (`MIN`\|`CENTER`\|`MAX`) |
| `size` | `"H/V"` resizing, each `FIXED`\|`HUG`\|`FILL` (e.g. `FILL/HUG` = fills width, hugs height) |
| `fill` · `stroke` · `radius` · `effect` · `opacity` | token names (`card`, `border 1` = token + width, `radius/3xl`, `shadow/sm`); a raw hex/number = not tokenized |
| `image` | an image fill: `photos/<name>` |
| `abs` | `[x, y]` — pinned outside the auto-layout flow |
| `kids` | child nodes |
| `comp` · `props` | an instance: `"Button {variant=ghost, size=icon, disabled=false}"` + the property values set on it |
| `overrides[]` | what this instance changed inside the component. `n` is the layer path (`"Text › Title"`, separator ` › `); plus `text`, `visible`, `stroke`, `fill`, `comp`, `props` |
| `bind` | which component property drives this layer: `{ characters: "label" }`, `{ visible: "showIcon" }` |
| `text` | `{ style, color, align, value, segments? }` — `style` is a text-style name (or `a + b`), `align` is `LEFT\|CENTER\|RIGHT`, `segments[]` are styled runs inside one text node (own `style`, `color`, `font`) |

### 5.6 Prototype — `prototype.json`

`flows[]` (`name`, `screen`), `screens["<screen name>"][]` and `componentInteractions[]`, each entry `{ on | component+layer, trigger, action, to?, transition? }`.
Seen so far: `trigger: on_click`; `action: navigate | change_to | back`; `transition: push | dissolve | instant | smart_animate` + duration. `change_to` targets a **component variant** (`SheetOption {selected=true}`), not a route.

### 5.7 Icons & photos

`icons.json`: `{ "library": "lucide-react", "icons": [ { "figma": "icon/arrow-right", "component": "ArrowRight", "custom": false } ] }`.
`photos.json`: `photos[]` of `{ name, file: "name@{2,3}x.jpg", size: [w, h] (largest display size), original: [w, h], usedIn: [screen › layer path] }`.

## 6. Reading the Spec → Web Code

### 6.1 Styling

| Spec | Code |
|---|---|
| `fill: "card"` | `bg-card` (frame/rectangle). For text: `text.color: "muted-foreground"` → `text-muted-foreground`. For icons/vectors: `text-*` on the icon (`currentColor`) |
| `stroke: "border 1"` | `border border-border`; `"brand 3"` → `border-3 border-brand`; width `0` → no border. Inside strokes ≈ `border`; outside strokes ≈ `ring`/`outline` |
| `radius: "radius/3xl"` | `rounded-3xl`; `radius/full` → `rounded-full` |
| `effect: "shadow/sm"` | `shadow-sm` (from the generated `--shadow-sm`) |
| `opacity: 0` | the layer is not visible: don't render it unless an override or a state shows it |
| `text.style: "title/lg"` | `text-title-lg` on the right element (`h2`, `p`, `label`, …); slashes become dashes |
| `text.style: "a + b"` / `segments` | a text node mixing styles: render one `<span>` per run with its own text-style utility and colour token |
| `text.align: LEFT / RIGHT / CENTER` | `text-start` / `text-end` / `text-center` — never `text-left/right` |
| `image: "photos/x"` | `next/image` (see §8) |

### 6.2 Layout

| Spec | Code |
|---|---|
| `layout.dir: row` / `col` | `flex flex-row` / `flex flex-col` |
| `gap: "card/gap"` (a Layout token) | the matching generated utility (`gap-card`) or standard step (`gap-3`) — see §6.3 |
| `pad: [t, r, b, l]` | `pt-* pe-* pb-* ps-*` (right → `pe`, left → `ps`); equal sides collapse to `p-*`/`px-*`/`py-*` |
| `main: MIN / CENTER / MAX / SPACE_BETWEEN` | `justify-start / -center / -end / -between` |
| `cross: MIN / CENTER / MAX` | `items-start / -center / -end` |
| `size` horizontal `FILL` | `w-full` in a column parent; `flex-1 min-w-0` in a row parent |
| `size` horizontal `HUG` | `w-fit` (or no width class) |
| `size` horizontal `FIXED` | only deliberate constants (icon/avatar/control size → token class like `size-10`); otherwise `w-full max-w-*` — never the canvas `w` |
| `size` vertical `FILL` / `HUG` / `FIXED` | `flex-1`/`h-full` · auto · `h-*` for control heights only, else `min-h-*` |
| `abs: [x, y]` | `absolute` inside a `relative` parent with logical offsets (`start-*`, `top-*`); rebuild the position with layout where possible — never copy canvas offsets |
| Grid / wrap (if the exporter emits `wrap` or `grid`) | `flex-wrap` / `grid grid-cols-*` with the same `gap` |

### 6.3 Tokens → classes

- `radius/3xl` → `rounded-3xl` · `spacing/4` → step `4` (`gap-4`, `p-4`) · `spacing/1_5` → step `1.5`.
- When a spacing value equals the Tailwind default step, use the stock class. When the design's scale differs, the generator emits `--spacing-<name>` so `p-<name>` / `gap-<name>` exist.
- Layout tokens (`page/padding-x`, `card/gap`, `section/gap-y`) become named utilities from the generator (`px-page-x`, `gap-card`). Their `description` often says the Tailwind equivalent — trust it.
- Theme role `highlight-muted` → `bg-highlight-muted` / `text-highlight-muted`. Fonts: `font/heading` → `font-heading` (via `next/font` variables; the `code` field names the variable).
- A **raw hex** in the spec → map to the nearest Theme role, note it in the report, never add the hex.

### 6.4 Components

- `comp: "Button {variant=ghost, size=icon, disabled=false}"` + `props` → `<Button variant="ghost" size="icon">`. Omit props equal to the default.
- `bind: { characters: "label" }` → that text is the component's `children`/`label` prop. `bind: { visible: "showIcon" }` → an optional `icon` slot, rendered only when provided.
- `overrides` → what this screen retypes or hides inside the instance: `{ n: "Text › Title", text: {…} }` retypes a layer; `visible: false/true` hides/shows one; `fill`/`stroke`/`comp` change a colour or swap an icon. Components with no Figma properties get **all** their content this way — their code props are named after the overridden layers.
- Icon `comp: "icon/arrow-right"` → `import { ArrowRight } from 'lucide-react'` via `icons.json`; `custom: true` → `components/icons/`.
- **Hidden means absent.** `visible: false` means the layer isn't shown on that screen. A component's default text is placeholder unless a screen shows it.

### 6.5 Prototype → behaviour

| Prototype | Web |
|---|---|
| `navigate` to a screen | `<Link href>` to the route in `docs/app/screens.md` (a link, not an `onClick`) |
| `back` | `router.back()` from the feature hook, with a fallback `href` when there's no history (deep link / new tab) |
| `change_to` a component variant | controlled state of that component (tab selected, row expanded, player playing) — not a route |
| overlay open/close (`open_overlay`, `close_overlay`, a frame shown over another) | `Dialog` / `Sheet` / `Popover` / `DropdownMenu`; focus-trapped and Escape-closable |
| `open_url` | `<a href rel="noopener noreferrer" target="_blank">` only if the design says new tab |
| `on_hover` / `while_hovering` | `hover:` utilities; never the only way to reach content |
| `after_delay` | avoid; ask or record a decision |
| `transition: push / dissolve / instant` | use the default navigation (instant); View Transitions only if the build plan asks |
| `transition: smart_animate 0.25s` | a CSS `transition` of the changed properties at that duration, wrapped in `motion-safe:` |

The overlay, hover, URL and delay rows have not appeared in exports yet — they are the mapping to use when they do.

## 7. Build Workflow

0. **Gate:** `node scripts/check-design.mjs` passes. If not, stop and run Phase 0 ([DESIGN-GATHERING.md](./DESIGN-GATHERING.md)).
1. Read `design/README.md`, then `docs/app/product.md`, `build-plan.md`, and the current stage's section.
2. **Tokens first.** Run `node scripts/generate-theme.mjs`; confirm `--check` passes. Fonts via `next/font` with the families in `typography.json` (check glyph coverage for the product's languages and scripts, and document fallbacks).
3. **Primitives.** For each component in the stage: read every variant in `components.json`, then add or adapt the shadcn primitive so variants/props match **by name** ([shadcn contract §6](./shadcn-component-contract.md)). Show every variant in a `/dev/gallery` route (dev only).
4. **Composites** (`components/shared`, then feature components) from the component trees.
5. **Screens.** Read the screen tree top-down; map each instance to a component with its props/overrides; take every string from the spec; wire behaviour from `prototype.json` through feature hooks.
6. **Responsive & states** (§9), **assets** (§8).
7. **Compare** with the screenshots (§10), fix, then `verify`.

## 8. Assets

- **Text comes from the spec** (already content-reviewed). Don't rephrase, shorten or "improve" it; keep special characters, non-breaking spaces and line breaks exactly. Where `docs/app/content-rules.md` names another source for a section, follow that.
- **Sample data isn't content.** Layer names marked `Sample ·`, dates, counts and user names show the *format*; the app fills them from real data.
- **Icons:** `lucide-react` by name from `icons.json`; custom SVGs become `components/icons/*.tsx` using `currentColor`.
- **Illustrations** (`design/illustrations/*.svg`): convert to React components (SVGR or by hand). Background shapes the design colours with a token take that token; everything else keeps its drawn colours. **Legends and numbered markers are UI, not SVG.** Text inside art stays live text when the spec overrides it, otherwise it stays as drawn. Give meaningful art an accessible name (`role="img"` + `aria-label`); decorative art `aria-hidden`.
- **Photos:** `photos.json` gives the displayed `size` and where each is used. Use the largest file (@3x) as the source in `public/photos/` or as a static import and let `next/image` produce the responsive sizes; always set `alt` from the design or the product copy (empty `alt=""` only for decoration).
- **Fonts:** `next/font` (Google or local), exposed as CSS variables that match the `code` field of the Typography variables.
- **Theme changes** happen only via re-export + `node scripts/generate-theme.mjs`.

## 9. Responsive Design, States and Themes

**Breakpoints.** Map each designed frame width to the highest Tailwind breakpoint it fits and write the mapping down in `docs/app/screens.md` (e.g. 390 → base, 768 → `md`, 1440 → `xl` with a `Container` cap). Code mobile-first.

- **All widths designed:** diff the same screen's trees across widths; express *only the differences* (direction, columns, visibility, gap/padding, text style) as breakpoint prefixes. Build the smallest first.
- **One width designed:** treat that frame as the reference at its width. Narrower: collapse multi-column to one column. Wider: cap with `Container` and keep the composition. Add no elements; record the derived layout under *Decisions made*.
- Never convert a frame's `w`/`h` into fixed CSS sizes (§6.2). Long text, large text sizes and translations must not break the layout.

**States.** Each state variant in `components.json` becomes a CSS state on the same component: `hover` → `hover:`, `focus` → `focus-visible:`, `pressed` → `active:`, `disabled` → `disabled:` / `aria-disabled`, `loading` → `aria-busy` + inline spinner, `selected` → `aria-selected` / `aria-pressed` / `data-[state=…]`, `expanded` → `aria-expanded`, `error` → `aria-invalid`. States the design doesn't draw use shadcn's token-based defaults (`hover:bg-primary/90`, `ring` focus) and are logged. Empty, loading and error states for data views are built as skeleton / empty / error variants even if only the filled state is drawn (simplest version, logged).

**Themes.** Generated `:root` (light) and `.dark`. A Theme role with no designed dark value copies the nearest existing dark role (nearest by colour distance), is marked `TEMP dark` in the export notes, and must stay readable and pass contrast. Use `next-themes` (`attribute="class"`, `defaultTheme="system"`).

**Direction.** If the product has RTL locales, build with logical classes from the start ([layout contract](./layout-and-styling-contract.md)); mirror layout, not art that depends on real-world orientation (maps, diagrams, brand marks) unless the design says so.

## 10. Verification Against the Design

For every screen built, at each designed width and in each designed theme:

1. Run the app at the frame's width (`w` of the screen tree) and capture the route (Playwright screenshot or the browser).
2. Put it next to `design/screens/<theme>/<breakpoint>/NN <name>.png` (1×).
3. Check, in order: structure and order of elements → spacing and sizes (within one token step) → typography (style, size, weight, wrap) → colour roles → icons and images (crop, size) → every state and interaction in `prototype.json` → text exactly matches the spec.
4. Acceptable differences: font anti-aliasing, scrollbars, sub-pixel rounding, system-font fallbacks. **Not acceptable:** a wrong token, a missing element, a different order, a size off by a token step or more, an invented element or state.
5. List screens compared and every remaining difference under **Matches design** in the final report ([CLAUD_PERMISSIONS.md](./CLAUD_PERMISSIONS.md) §6). If the spec and the screenshot disagree, the spec wins and the report says so.
6. Run axe and the keyboard pass ([verification-contract.md](./verification-contract.md) §4). Contrast pairs are checked by `generate-theme.mjs --check` for both themes.

**What the generator (`scripts/generate-theme.mjs`) must do** — written once per project, kept in the repo:
reads `spec/tokens.*.json` + `typography.json`; writes `styles/tokens.generated.css` containing the primitives (`--color-*`), Theme roles in `:root` and `.dark`, an `@theme inline` block exposing every role/radius/spacing/font/shadow as a utility, and one `@utility text-<style>` per text style (size, line height, weight, letter-spacing, case, family); writes `spec/tokens.json`; fails (`--check`) when the committed output is stale, when a role is missing in either theme, or when a configured foreground/background pair misses WCAG AA (4.5:1 text, 3:1 large text/UI).

## 11. Re-Exports and Change Management

1. Re-run the export — Phase 0 with the plugin (§4.3, [DESIGN-GATHERING.md](./DESIGN-GATHERING.md)) — until the gate passes. Commit `design/` alone, so `git diff design/` is the design change.
2. Write `docs/app/revision-N.md`: tokens added/changed/removed, components and variants changed, screens added/removed/retyped, copy changes, TEMP values, decisions. This is the map; the spec stays the source.
3. `node scripts/generate-theme.mjs`; update `docs/app/components.md` and `screens.md`; adjust `build-plan.md`.
4. **Delete what the design removed** — components, routes, tests, content, tokens, locale keys no longer used. Keep a superseded spec folder (`design/revision-N-1/`) only if tests still read it, and say why in its README.
5. Re-run the affected comparisons (§10). Existing modules keep working with their tests green.

## 12. Prompt Templates

**Build from the design (whole product, one run)**

```text
Follow docs/FIGMA-DESIGN-HANDOFF.md, docs/ARCHITECTURE.md and docs/CLAUD_PERMISSIONS.md. Read design/README.md, then build every stage
of docs/app/build-plan.md in order from design/spec exactly (names, variants, props, tokens, copy), comparing against design/screens
at every designed width in light and dark, running verify and committing locally after each stage, without stopping between stages.
Decide ambiguities yourself and log them. Finish with the final report. Do not push.
```

**Apply a new design revision (one run)**

```text
A new export is in design/ (git diff shows the change). Follow FIGMA-DESIGN-HANDOFF.md §11: write docs/app/revision-[N].md, regenerate
the theme, update components.md/screens.md, delete what the design removed, rebuild what changed, run verify, commit locally, and
finish with the final report. Do not push.
```

**Per-screen builder checklist:** tokens only (no hex/palette/arbitrary px) · component names, variants and props match Figma · every string from the spec · hidden layers absent · logical classes only · every prototype tap works · all states handled · mobile-first at each designed width · light and dark compared · axe clean · differences listed.
