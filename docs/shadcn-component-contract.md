# 🧩 shadcn/ui Component & Design-System Contract

**Role:** You are an expert Design System Architect for a Next.js app built on **shadcn/ui** (Radix-based primitives you own as source), **Tailwind CSS v4** and `class-variance-authority`. Components are copied into the repo with the shadcn CLI and are then **our code**: we adapt them to the design tokens and the contracts below. Design values come from Figma through [FIGMA-DESIGN-HANDOFF.md](./FIGMA-DESIGN-HANDOFF.md).

## 1. Component & Variant Integrity (No Class Pollution)

i. **Component-first rule:** ALWAYS use the existing `components/ui/*` primitives (`Button`, `Card`, `Input`, `Label`, `Separator`, `Dialog`, …) instead of raw `<button>`/`<input>`/`<div>` styled by hand. Radix (`radix-ui` / `@radix-ui/*`) is imported **only inside `components/ui/`**.
ii. **Strict variant usage:** do NOT override styling via `className` if a `variant`/`size` prop already covers it.
    - ❌ **BAD:** `<Button className="bg-red-500">Delete</Button>`
    - ✅ **GOOD:** `<Button variant="destructive">Delete</Button>`
iii. **Small one-off tweak → copy the file, don't patch it.** If one screen needs a `Button`/`Card`/`Input` that looks meaningfully different from every other use (a special CTA, a promo card), don't bolt one-off `className` overrides onto `components/ui/button.tsx`, and don't edit that file just for this one caller. Copy it to a new file under `components/ui/` with a name describing what it is (`components/ui/cta-button.tsx`, not `button-2.tsx`) and modify the copy.
iv. **Big/structural change → edit the base primitive.** If the change should apply everywhere `Button` is used (a new shared variant, a global radius/size change), edit `components/ui/button.tsx` directly. Forking for something that belongs to everyone creates two sources of truth.
v. **Rule of thumb:** reaching for a `className` string longer than the variant already gives you is the signal to copy the file, not to keep stacking overrides.
vi. **Slots over flags:** `asChild` (Radix `Slot`) for rendering a primitive as a `Link`; slot props (`icon={<Icon/>}`, `action={<Button/>}`) over booleans that don't compose.

## 2. The `cva` + `data-slot` Pattern (mandatory for every `components/ui/*` primitive)

Every primitive defines its variants with `class-variance-authority`, merges classes with `cn()` from `lib/utils.ts`, takes `React.ComponentProps<'element'>` (React 19: `ref` is a normal prop — no `forwardRef`), and carries a `data-slot="…"` attribute so parents can style it by slot.

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-body-md transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: { default: 'bg-primary text-primary-foreground hover:bg-primary/90', destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' },
      size: { default: 'h-10 px-4', icon: 'size-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
```

i. **Interaction states are plain CSS variants:** `hover:`, `focus-visible:`, `active:`, `disabled:`, `aria-expanded:`, `data-[state=open]:`. There is no platform fork. Hover styles only ever apply on hover-capable pointers in Tailwind v4, so touch devices don't get sticky hover.
ii. **Compound components** coordinate through CSS and data attributes, not prop drilling: a parent sets `data-variant`/`group`, children react with `group-data-[variant=…]:` — so `<Button variant="destructive"><Icon/>Delete</Button>` styles its icon and text with zero extra props. A new `Badge`, `Alert` or similar follows the same approach; callers never re-specify text colour for each variant.
iii. **Match Figma exactly** ([handoff doc](./FIGMA-DESIGN-HANDOFF.md) §6): every Figma component becomes one code component with the **same name**; Figma variant properties become props with the same names and values (`variant="ghost" size="icon"`); Figma text/boolean/instance-swap properties become props (`label` → `children`, `showIcon` → an optional `icon` slot). Don't create components the design doesn't have, and don't merge two design components into one.

## 3. Semantic Tokens ONLY (Zero Palette Hardcoding)

i. **Absolute ban on colour scales and literals:** STRICTLY FORBIDDEN to use raw palette scales or hex/rgb/oklch literals — `bg-red-500`, `text-blue-600`, `bg-white`, `bg-[#1E293B]`, `style={{ color: '#fff' }}`. The theme file does not even expose the palette to utilities.
ii. **Semantic tokens mandate:** use only the roles defined as CSS variables in the generated theme file (`styles/tokens.generated.css`, imported by `app/globals.css`) and exposed through `@theme inline`:
    - Surfaces: `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-primary`, `bg-secondary`, `bg-accent`, `bg-destructive`
    - Text: `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-destructive-foreground`, `text-card-foreground`
    - Borders & focus: `border-border`, `border-input`, `ring-ring`
    - Any further role the design defines (`bg-highlight-muted`, `text-success`, …) is added by the generator, never by hand.
iii. **Why:** the `:root` and `.dark` blocks are the single source of truth for both themes. A hardcoded colour bypasses dark mode the moment the user switches theme.
iv. **Typography only through the generated text-style utilities** (`text-title-lg`, `text-body-md`, `text-overline`), which bundle size, line height, weight and letter-spacing from the Figma text styles. Never set `text-[17px]`, `leading-*`, `font-bold` or `tracking-*` by hand. Pick the HTML element for meaning (`h2`, `p`, `label`), the utility for looks.
v. **Shadows, radii, spacing, fonts** come from the same generated theme (`shadow-md`, `rounded-3xl`, `gap-3`, `font-heading`). Add nothing to them outside the generator.
vi. **Icons:** `lucide-react` (plus custom SVG React components in `components/icons/` that use `currentColor`). Size with `size-4`, colour with a text token (`text-muted-foreground`) on the icon or its parent. Directional icons (chevrons, arrows) add `rtl:rotate-180` (or `rtl:-scale-x-100`) — see [layout contract](./layout-and-styling-contract.md).

## 4. Flexible Layouts (Zero Pixel Poisoning)

i. **No fixed dimensions:** forbidden to use arbitrary pixel widths/heights (`w-[342px]`, `h-[58px]`) except genuinely fixed chrome that the design defines as a constant (icon sizes, control heights, avatar sizes — prefer `size-10`, `h-10`, or a named token). Prefer `w-full`, `max-w-md`, `flex-1`, `min-h-10`. A Figma frame's `w`/`h` is canvas size, not a CSS instruction.
ii. **No absolute-positioning hacks:** never use `absolute`/`fixed` to force alignment that flexbox/grid handles. Allowed: overlays, badges on avatars, decorative art — always inside a `relative` parent, with logical offsets (`start-2`, `top-2`).
iii. **Spacing via gap:** `gap-{size}` on the parent — see [layout-and-styling-contract.md](./layout-and-styling-contract.md).

## 5. Accessibility (non-negotiable)

i. Radix primitives supply roles, focus management and keyboard handling — don't re-implement them with `div`s. Dialogs/sheets/menus come from `Dialog`, `Sheet`, `DropdownMenu`, `Popover`, `Tabs`, etc.
ii. Every interactive element has an accessible name (visible text, `aria-label` or `aria-labelledby`). Icon-only buttons always get `aria-label`.
iii. State is exposed with attributes, not just colour: `aria-expanded`, `aria-pressed`, `aria-current="page"`, `aria-selected`, `aria-invalid`, `aria-busy`, `disabled`.
iv. Focus is always visible (`focus-visible:ring-*` from the `ring` token); never `outline-none` without a replacement.
v. Hit areas: ≥ 44×44 px for touch layouts (below `md`), never below 24×24 px anywhere (WCAG 2.2 AA). Use padding or a pseudo-element to enlarge small visuals.
vi. Motion uses Tailwind `transition-*` / `tw-animate-css` classes and respects `motion-reduce:`.
vii. Text/background pairs must meet WCAG AA (4.5:1 body, 3:1 large text and UI). The theme generator checks the token pairs; see [verification-contract.md](./verification-contract.md).

## 6. Adding a New Primitive

- **Step 1:** Check whether the shadcn registry already ships it — `npx shadcn@latest add <component>` (or the repo's package-manager equivalent). Never hand-write what the CLI provides.
- **Step 2:** Immediately **audit the generated file** against these contracts: replace palette classes with tokens, convert any physical-direction or margin classes (`ml-auto`, `pl-8`, `left-2`, `text-left` — registry output may include them) to gap/logical ones, make sure the design's variants and names are matched, and keep `data-slot`.
- **Step 3:** If the component wraps text or icons, size them from the parent via data/group selectors so callers don't re-specify classes.
- **Step 4:** Never re-run `add --overwrite` over a customised primitive without diffing first — the file is ours now.
- **Step 5:** Add the component to the Figma-component → code map in `docs/app/components.md` and to the architecture test's export list.
