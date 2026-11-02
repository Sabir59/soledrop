# 🛰️ Design Gathering & the Development Gate (Phase 0)

For any design-driven project, **development does not start until the full design has been gathered into `design/` and the design gate passes.** Gathering is the **first part of the one continuous run** (Phase 0): it is done with your local plugin first, MCP only as a fallback, and when the gate passes the run flows straight into the build. What the gathered files look like, and how they are read, is in [FIGMA-DESIGN-HANDOFF.md](./FIGMA-DESIGN-HANDOFF.md); this document is the procedure that produces and certifies them.

## 1. The Rule

1. If `design/` is missing, incomplete or stale → run Phase 0 before anything else.
2. If `node scripts/check-design.mjs` passes and the owner hasn't said the design changed → Phase 0 is already done; go straight to the build.
3. No component, route, token or copy is built from memory, from a screenshot alone, or from a guess. Everything in the UI traces back to a file under `design/spec`.

## 2. Sources, in Priority Order

| # | Source | When | Notes |
|---|---|---|---|
| 1 | **Local plugin** (your own Figma plugin; the export in hand was produced with the Figma AI Bridge Executor — its commands are listed in handoff §4.2) | Always the first choice | Full fidelity: every output in the `design/` contract (tokens, styles, component trees, screen trees, prototype, icons, screenshots, assets). |
| 2 | **Figma MCP** | The plugin isn't reachable, or a small top-up is enough (one re-pulled frame, one missing asset) | Tool names and coverage differ per server. Whatever it returns is **written into `design/` in the contract's file shapes first**; the builder never reads MCP output directly. Anything it cannot provide (typically prototype taps, effect styles, some override data) is recorded as a **gap** in `design/README.md`. |
| 3 | **Owner-attached export** | Neither of the above can be reached | Same gate applies. |

Never acceptable: screenshots only, scraping a shared link, filling gaps with plausible-looking values.

## 3. Phase 0 Procedure

0. **Pre-flight.** Run `node scripts/check-design.mjs`. Passing and not stale → Phase 0 is already done; skip to the build.
1. **Read the project's source note**: `docs/app/design-source.md` (file name and key, which pages/sections to export, how this project's plugin is invoked, the MCP server name if any). If it is missing, create it from the skeleton in §7 with what you can determine, and list the unknowns under *Needs from you*.
2. **Glance at the designer checklist** (handoff §3) against what you see. Report violations (raw values, unnamed layers, missing dark roles); don't block on them unless the gate fails.
3. **Gather in this order** — later steps refer to earlier ones, and the gate checks those references:
   1. variables → `tokens.light.json` (+ dark)
   2. styles → `typography.json`
   3. components → `components.json` (every variant)
   4. screens → `screens-NN-MM.json` (≤ 7 per file) for **every** designed frame, every breakpoint, every theme
   5. prototype → `prototype.json`
   6. icons → `icons.json`
   7. images and screenshots last: `screens/<theme>/…png`, `illustrations/`, `photos/` + `photos.json`, custom `icons/`
   Use the export prompt in handoff §4.3 for the plugin. Don't hand-edit exported JSON; to fix something, re-run the command for that scope.
4. **Write `design/README.md`** from the template (handoff §4.4): file key, export date, tool used, what changed, known deviations, **gaps**, and the exact commands/tools used.
5. **Run the gate** (§4). On a FAIL: re-gather that scope, run again. If the cause is the Figma file itself (a role with no dark value, a component the plugin can't read), list it under *Needs from you — design fixes*, and write the accepted gap in the README. If the gate still fails after that, apply the hard-stop rule in [CLAUD_PERMISSIONS.md](./CLAUD_PERMISSIONS.md) §5 (build what doesn't depend on the design, mark the rest blocked) — the run itself doesn't stop.
6. **Intake** (still no application code):
   - run `node scripts/generate-theme.mjs` and confirm `--check` passes;
   - draft `docs/app/components.md` (Figma component → code path, props, variants, where used) and `docs/app/screens.md` (screen → route/state, breakpoint mapping) from the spec; draft `docs/app/build-plan.md` (ordered stages with "Done when:" criteria) if it doesn't exist, and create `docs/app/build-log.md`;
   - if this is a re-export, write `docs/app/revision-N.md` (handoff §11).
7. **Commit** `design/` and the intake docs separately and locally (`design: export rev N`, `docs: design intake`). Do not push.
8. **Record Phase 0 in `docs/app/build-log.md`** (format in §6) and **continue straight into build stage 1 — do not stop** — provided the gate passed. If the gate failed and can't be repaired, follow the hard-stop rule in [CLAUD_PERMISSIONS.md](./CLAUD_PERMISSIONS.md) §5 (build what doesn't depend on the design, mark the rest blocked). Stop after Phase 0 only if the request was explicitly gathering-only.

## 4. The Gate — `scripts/check-design.mjs`

`node scripts/check-design.mjs [designDir] [--json]` — zero dependencies, exit code 1 on any FAIL. It is also step 4 of `verify`, so design/code drift is caught after every stage.

| Gate | FAIL when | Warns when |
|---|---|---|
| G1 files | `README.md`, `spec/tokens.light.json`, `typography.json`, `components.json`, `prototype.json`, `icons.json` or any `screens-*.json` is missing | — |
| G2 parse | a spec file isn't valid JSON | no `section` / `exportedWith` field |
| G3 tokens | a variable aliases a missing variable or has no value; a Theme role has no dark value (when a dark file exists) | no Web `code` syntax; no dark tokens at all |
| G4 styles | a node uses a text style or effect style that isn't in `typography.json` | — |
| G5 token refs | a fill / stroke / radius / gap / padding / text colour names a variable that doesn't exist | — |
| G6 components | an instance names a component that isn't in `components.json` (and isn't an icon, illustration or a screen) | a screen is embedded as a backdrop (sheets/overlays) |
| G7 screens | duplicate screen numbers; a screen has no light screenshot | numbering jumps; no dark screenshots, or fewer than light |
| G8 prototype | a flow or tap points at a screen that doesn't exist | a `change_to` targets an unknown component; a screen has no taps |
| G9 assets | a used photo lacks its `photos.json` entry, `@2x` or `@3x` file; a used illustration SVG is missing; an icon has no lucide name; a custom icon has no SVG | — |
| G10 raw values | — | a raw hex / number sits where a token belongs (the builder maps it to the nearest token and reports it); layers with `opacity: 0` |

**Pass = zero FAIL.** Warnings are copied into the Phase 0 report and into *Decisions made* when a build hits them.

**What the gate proves, and what it doesn't.** It proves the export is complete and internally consistent: every reference resolves and every file the builder needs exists. It does **not** prove the export matches the *current* Figma file or that the design is right. That is covered by recording the export date and Figma version in `design/README.md`, by the owner saying when the design changed (then re-gather, handoff §11), and by the screenshot comparison after every stage (handoff §10).

## 5. Rules While Gathering

- Write only under `design/`, plus the intake drafts in `docs/app/`. No application code, no dependency installs for the product (tooling for the gate and theme generator is fine).
- Don't "tidy" the design: raw values stay raw in the export and get a warning; the Figma file is the owner's to fix.
- Plugin/MCP credentials are never written to the repo, logs or `design/README.md`.
- Large frames: chunk and re-run; never drop nodes to make a file smaller. A node that can't be exported is a gap, recorded by name.
- `scripts/check-design.mjs` ships with this doc set — copy it in if absent. The theme generator is specified in handoff §10: build it if absent, run it, commit it.

## 6. Phase 0 Log Entry (append to `build-log.md` with exactly this; it is also shown in the final report)

```
## Phase 0 — Design gathering: done
Source: plugin | MCP | owner-attached     Figma file: <name> (<key>) · exported <date> · rev <N>
Captured: <n> tokens · <n> text styles · <n> components (<n> variants) · <n> screens · <n> light / <n> dark screenshots · <n> taps · <n> icons · <n> photos · <n> illustrations
Gate: ✓ passed (0 FAIL, <n> warnings)   — or ✗ blocked: <what and why>
Warnings: <the G10/G7/G6 items, one line each>
Gaps: <what the source couldn't provide, and how builds will cope>
Intake: components.md ✓ · screens.md ✓ · build-plan.md ✓ · theme generated ✓ · theme check ✓
Decisions made: <each choice, one-line reason>
Needs from you: <design fixes, missing assets, plugin/MCP access — or "nothing">
Continuing: stage 1 — <name>
```

## 7. When the Design Can't Be Reached

If `design/` is absent **and** neither the plugin nor MCP is reachable and nothing is attached: do not invent the design and do not stop idle. Do all the work that doesn't depend on it — scaffold the repo per [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md), initialise Next.js/Tailwind/shadcn, add tooling, the gate script, the theme generator skeleton and the architecture tests — mark the design-dependent checks `blocked: no design export`, and report under *Needs from you*: "run the export with your plugin (or attach `design/`)".

**`docs/app/design-source.md` skeleton**

```md
# Design source
Figma file: <name> · key <key> · link <url>
Pages / sections to export: <names>   Frames: <naming convention>, breakpoints: <390 / 768 / 1440>, themes: <light, dark>
Primary (plugin): <plugin name> — how it is invoked here: <exact steps / command / bridge address>
Fallback (MCP): <server name> — tools used: <names>
Output folder: design/   Export owner: <who>   Last export: <date> · Figma version: <id/date>
Known gaps / accepted deviations: <list>
```

## 8. Prompts

**Gather, then build everything (default)**

```text
Follow docs/DESIGN-GATHERING.md, docs/ARCHITECTURE.md and docs/CLAUD_PERMISSIONS.md. Work in ONE continuous run: complete Phase 0 with
my local plugin (MCP only as fallback) and pass the design gate; then build EVERY stage of docs/app/build-plan.md in order, running
verify and committing locally after each stage, without stopping between stages. Resume from docs/app/build-log.md if it exists.
Finish with the full verification and the single final report. Do not push. Do not deploy.
```

**Gather only**

```text
Follow docs/DESIGN-GATHERING.md. Run Phase 0 only: export the full design into design/ with my local plugin, write design/README.md,
pass scripts/check-design.mjs, do the intake (theme, components.md, screens.md, build-plan.md), commit locally, and stop with the
Phase 0 entry. Do not write application code. Do not push.
```

**Design changed**

```text
The Figma design changed. Follow docs/DESIGN-GATHERING.md and FIGMA-DESIGN-HANDOFF.md §11 in one run: re-gather with the plugin, pass the
gate, write docs/app/revision-N.md, regenerate the theme, rebuild only what changed and delete what the design removed, run verify, and
finish with the final report. Do not push.
```
