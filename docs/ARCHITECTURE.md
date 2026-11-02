# 🏛️ Core Architecture & Development Standards — Web

This is a **Next.js (App Router) web application** built with TypeScript (strict), **shadcn/ui** (Radix primitives) on **Tailwind CSS v4**, **TanStack Query** for server state, **React Hook Form + Zod** for forms, `next-themes` for light/dark, and `lucide-react` for icons. Design values arrive from Figma as exported JSON and are compiled into the theme (see the handoff doc below). See [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) for the canonical file tree and what each folder may import.

Product-specific facts — what the product is, its screens, build plan, content rules and the Figma-component map — live in `docs/app/` (see [app/README.md](./app/README.md)). Everything else in `docs/` is universal and is copied unchanged from project to project.

## The contracts

This repository strictly enforces these foundational contracts. All code generation, feature additions and refactoring MUST comply with them:

1. [UMDA Protocol](./UMDA-architecture-contract.md) → `app/api` (BFF) → `api/` → `hooks/api/[domain]/` → `context/` → `features/[feature]/` → `app/` layering, the server/client boundary, layered auth (proxy + DAL), readable naming, PSP fraud security. No `domains/` layer — keep the structure lean.
2. [State Management Protocol](./state-management-contract.md) → URL state, TanStack Query for server state, React Context + `useReducer` for app-wide singleton client state, Zustand reserved for future feature-local stores, server-rendering hydration safety.
3. [shadcn/ui Component Contract](./shadcn-component-contract.md) → Radix primitives + CVA variants, semantic tokens only, the copy-the-file-don't-patch-it rule for one-off tweaks, accessibility.
4. [Layout & Styling Contract](./layout-and-styling-contract.md) → flex/grid gap supremacy, zero physical margins, RTL via logical properties, mobile-first responsive rules.
5. [Form & Validation Contract](./form-and-validation-contract.md) → React Hook Form + Zod + `Controller` + shadcn `Field`, the `use-[x]-form.ts` + `[x]-form.tsx` split, one schema shared with the server.
6. [Comments & JSDoc Contract](./comments-and-jsdoc-contract.md) → comment only for genuine traps, JSDoc for exported functions, 2-line cap, sound human.

And these process documents:

7. [Verification Contract](./verification-contract.md) → what `verify` chains, the architecture tests, unit/e2e/a11y expectations, honest reporting.
8. [Figma Design Handoff](./FIGMA-DESIGN-HANDOFF.md) → how a Figma file is exported as a `design/` spec, how that spec is read, and how a build is checked against it.
9. [Autonomy, Permissions & Single-Flow Build](./CLAUD_PERMISSIONS.md) → what you may do without asking, the push/deploy prohibition, the one-continuous-run rule (all stages, verify + local commit after each, no stopping between them), the resume rule, the final report format.
10. [Design Gathering & Gate (Phase 0)](./DESIGN-GATHERING.md) → for design-driven projects, the full design is gathered first (local plugin, MCP as fallback) and certified by `scripts/check-design.mjs` **before development starts**, as the first part of the same run.

## Order of authority

When sources disagree, the higher one wins, and the conflict is recorded under **Decisions made** in `docs/app/build-log.md` and the final report:

1. The exported design spec (`design/spec/*`) for **look, layout, tokens and component API** — and for text, unless `docs/app/content-rules.md` names another source for it.
2. `docs/app/*` for **product scope, behaviour, content sources and routing**.
3. The contracts above for **how the code is structured**.
4. Library defaults (shadcn registry output, Next.js defaults) only where nothing above speaks.

---

### Quick Task Prompt Template

Build everything in one flow (design-driven project):

> "Follow `docs/DESIGN-GATHERING.md`, `docs/ARCHITECTURE.md` and `docs/CLAUD_PERMISSIONS.md`. In one continuous run: gather the design with my local plugin and pass the design gate, then build every stage of `docs/app/build-plan.md` in order (verify + local commit after each, no stopping between stages), and finish with the final report. Resume from `docs/app/build-log.md` if it exists. Don't push."

A single task (narrow slice):

> "Follow the standards in `docs/ARCHITECTURE.md` to implement [Task Name]. Work autonomously per `docs/CLAUD_PERMISSIONS.md`, run verify, commit locally and report."

Design-driven build once `design/` exists and passes the gate:

> "Follow `docs/FIGMA-DESIGN-HANDOFF.md`. Read `design/README.md` first, then build from `design/spec`, compare with `design/screens`, and report differences."
