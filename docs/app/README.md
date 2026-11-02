# `docs/app/` — product-specific docs (you write these per project)

Everything else in `docs/` is universal. This folder holds the facts that belong to **one** product. The universal docs refer to these files by name, so create them early (a few lines each is enough to start).

| File | What it answers | Minimum content |
|---|---|---|
| `product.md` | What are we building, for whom, and what is **out of scope**? | purpose; in-scope features; **out-of-scope list**; platform/stack additions; locales (and which are RTL); offline/data/SEO needs |
| `design-source.md` | Where does the design come from and how is it gathered? | Figma file + key; pages/frames/breakpoints/themes to export; how this project's **plugin** is invoked; MCP fallback; last export date. Skeleton in [../DESIGN-GATHERING.md](../DESIGN-GATHERING.md) §7 |
| `build-plan.md` | In what order is it built? | ordered stages (Stage 0 = Phase 0 design gathering): scope, components, routes, **"Done when:"** acceptance criteria. The agent runs **all** stages in one continuous run. |
| `build-log.md` | What has the run done so far? | appended by the agent after every stage: built, decisions made, needs from you, blocked checks, commit. It is the **resume point** after an interruption and the source of the final report. |
| `components.md` | Which Figma component becomes which code component? | table: Figma component · code path · props (from Figma) · what changed in the latest revision · where used · stage |
| `screens.md` | Which Figma screen is which route/state? | table: screen # · Figma name · route/state · feature · stage; then navigation notes from the prototype |
| `content-rules.md` | Where does text come from and what may never be rephrased? | source-of-truth table (design copy vs existing copy vs owner-supplied), exactness rules, sample-data-is-not-content rule |
| `revision-N.md` | What changed between two design exports? | diff of tokens, components, screens; what to delete; decisions taken |

## Skeleton for `build-plan.md`

```md
# Build plan
Run ALL stages in order in one continuous run. After each stage: `pnpm verify` → local commit → append to build-log.md → next stage.

### S1 — Design system: tokens, fonts, primitives
Scope: generate theme, load fonts, build Button/Input/Card/… from design/spec/components.json.
Done when: the gallery route shows every component in every Figma variant, light and dark, matching the design.

### S2 — <next stage>
…
```

## Skeleton for `build-log.md` (the agent appends; never rewrite history)

```md
# Build log
## Phase 0 — Design gathering: done   (entry format: DESIGN-GATHERING.md §6)
## Stage 1 — Design system: done · commit a1b2c3d
Built: …   Verify: typecheck ✓ · lint ✓ · tests ✓ (42) · design gate ✓ · build ✓
Decisions made: … (one line each, with reason)   Needs from you: …   Blocked: …
## Stage 2 — … : in progress   ← the resume point
```

## Skeleton for `components.md`

```md
| Figma component | Code | Props (from Figma) | Used on | Stage |
|---|---|---|---|---|
| **Button** | `components/ui/button.tsx` | `variant`: default · secondary · outline · ghost · destructive; `size`: sm · default · lg · icon; `disabled`; `label`→children; `showIcon`+`icon`→icon slot | most | S1 |
```

Keep these files short and factual. If a statement here conflicts with the exported design spec about *look*, the spec wins; if it conflicts about *behaviour or scope*, this folder wins (see the order of authority in [../ARCHITECTURE.md](../ARCHITECTURE.md)).
