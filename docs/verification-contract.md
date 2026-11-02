# ✅ Verification Contract

Nothing is "done" until `verify` passes and the report says exactly what ran. The commands below use `pnpm`; use the repo's package manager.

## 1. `pnpm verify` — must pass after every stage, and again on the final tree

Chains, in this order (stop at the first failure, fix, re-run from the top):

1. `tsc --noEmit` — strict TypeScript.
2. `eslint .` — includes the Next.js, React hooks and a11y (`jsx-a11y`) rules. (`next lint` no longer exists in current Next.js; call ESLint directly.)
3. `vitest run` — unit tests **and** architecture tests (`tests/`).
4. `node scripts/check-design.mjs` — the design export is complete and every reference in it resolves (see [DESIGN-GATHERING.md](./DESIGN-GATHERING.md) §4). Then `node scripts/generate-theme.mjs --check` — generated theme files are in sync with `design/spec`, and the contrast pairs pass in light and dark. Skipped only for a project with no Figma design, and then reported as "n/a".
5. `next build` — the production build succeeds (type-checks routes, catches server/client boundary errors, `server-only` leaks and invalid dynamic usage).

Expected on the final tree (and after any stage that changes a critical flow): `pnpm e2e` (Playwright, §4).

## 2. Architecture tests (`tests/architecture.test.ts`) — keep them green and extend them

The tests scan source files with real globbing and regexes — they import no logic from the app, so they run in plain Node. Enforce at least:

- **Routes are thin:** `app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `not-found.tsx` contain no `"use client"`, `useState`, `useEffect`, `localStorage`, `fetch(` or `api/` imports; they import from `features/*/components`. (`error.tsx` / `global-error.tsx` may be `"use client"`.)
- **Client directive hygiene:** no `"use client"` in `api/`, `lib/`, `content/`, `features/*/schemas`, `features/*/types`, `hooks/api/*/queries.ts`.
- **Server-only discipline:** files that import `next/headers` or read `process.env` secrets start with `import 'server-only'`; `process.env` appears only in `lib/env.ts` and `lib/env.server.ts`.
- **Network boundary:** `fetch(` appears only in `api/`, `app/api/**`, `lib/`(server) and the BFF — never in `features/` or `components/`. `api/*` is imported only by `hooks/api/*`, `app/api/**` and server prefetch helpers.
- **Storage boundary:** only the persisted-state context file (and its storage module) references `localStorage`/`sessionStorage`/`document.cookie`.
- **No palette or literal colours** in any `className`, `style` or `cva` string (regex below).
- **No physical margin/padding/position/alignment classes and no `space-x/y`** (regex below). The only exemption is `components/shared/container.tsx` for `mx-auto`.
- **Features don't import other features' internals** (`features/a/**` importing `features/b/**`).
- **Radix is imported only inside `components/ui/`**; `dangerouslySetInnerHTML` appears only in an explicitly allow-listed file.
- **Every Figma component** listed in `docs/app/components.md` for completed stages has a matching export in `components/ui|shared` or its feature.
- **Design parity of tokens:** every theme role exists in both `:root` and `.dark`.

Reference patterns (tested against positive and negative cases — reuse them rather than rewriting):

```ts
// Matches ml-2, md:-mt-1, left-0, text-left, border-r-2, rounded-tl-md, space-x-2, float-left …
export const PHYSICAL_CLASS =
  /(?<![\w-])-?(?:(?:m|mx|my|mt|mb|ml|mr|pl|pr|space-x|space-y)-(?=[\w\[(.-])|(?:left|right)-(?=[\d\[(-]|px(?![\w-])|full(?![\w-])|auto(?![\w-]))|text-(?:left|right)(?![\w-])|border-(?:l|r)(?:-|(?![\w-]))|rounded-(?:l|r|tl|tr|bl|br)(?:-|(?![\w-]))|float-(?:left|right)(?![\w-]))/;

// Matches bg-red-500, text-white, border-gray-200, from-pink-500, bg-[#1E293B] …
export const PALETTE_CLASS =
  /(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow|decoration|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?(?![\w-])|-\[#[0-9a-fA-F]{3,8}\]/;
```

Run them over the string contents of `className`, `cn(...)`, `cva(...)` and `clsx(...)`, not over arbitrary prose, to avoid false positives in comments and copy.

## 3. Unit tests

- Pure logic gets tests: the state reducer and `normalize`, the write queue, migrations, search/format helpers, content loaders, Zod schemas (valid and invalid cases), DAL/permission helpers, query-key factories, resource-session ownership logic.
- **Route handlers** get tests with a mocked upstream: bad input → 400 with field errors, no session → 401, wrong role → 403, bot-check failure → rejected, happy path → DTO only (no leaked fields).
- Tests import the real modules — no re-implementations in the test file.

## 4. End-to-end, visual and accessibility checks (Playwright)

- Run each critical flow at the **designed widths** (the Figma frames — typically 390 / 768 / 1440), in **light and dark**, and in **RTL** when the product has an RTL locale.
- `@axe-core/playwright` on every route: zero serious/critical violations.
- Keyboard pass: every interactive element is reachable, the focus ring is visible, dialogs trap and restore focus.
- Visual comparison against the Figma screenshots in `design/screens/…` is done by eye (side by side) unless the project has committed Playwright baselines; list differences under "Matches design" in the final report (see [FIGMA-DESIGN-HANDOFF.md](./FIGMA-DESIGN-HANDOFF.md) §10).
- No horizontal scroll at 320 px; no layout shift when async content arrives.

## 5. Honesty

- Never report a check as passed if it didn't run. Use `blocked: <reason>` and keep going.
- Things automated tests can't prove (real screen readers, real devices and browsers, payment sandboxes, email delivery, third-party consoles) are listed in the final report as **needs manual check**.
- If the spec and a screenshot disagree, follow the spec and say so in the report.
