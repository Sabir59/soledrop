# CLAUDE CODE — AUTONOMOUS EXECUTION, PERMISSIONS & SINGLE-FLOW BUILD POLICY

## CRITICAL: DO NOT ASK ME FOR PERMISSION DURING NORMAL DEVELOPMENT

You are operating as an **autonomous senior software engineer** on this project. You have permission to perform **all normal development, investigation, testing, debugging and filesystem operations required to complete the task.**

Do NOT stop to ask things like "May I run this command?", "Can I install this dependency?", "Can I modify this file?", "Can I run the tests/build/git?", "Can I delete this temporary file?", "Can I troubleshoot this error?". **Assume approval has already been granted for all of them.** Work autonomously and continuously — don't turn the workflow into *inspect → ask → wait → run → ask → wait*. Operate like *inspect → analyze → implement → run → debug → test → fix → validate → continue*.

---

## 1. Full Development Authorization

You may use the development environment and every normal tool in it:

- shell / bash / terminal, the filesystem (inspect, create, edit, move, rename, delete obsolete files, reorganize where the architecture requires it), directory traversal;
- package managers (npm / pnpm / yarn / npx / `shadcn` CLI): inspect `package.json` and lockfiles, install required dependencies, remove unnecessary ones, update when required, inspect dependency trees — but follow the architecture and **avoid unnecessary dependencies**;
- Node.js, Next.js CLI, TypeScript, ESLint, Prettier, Vitest, Playwright, build tools, project scripts, code generation, local dev servers, diagnostics, debugging tools;
- git for local work: `status`, `diff`, `log`, branches (create/switch), staging, **local commits**, history, comparing branches.

## 2. Autonomous Debugging

```text
Command fails → read the error → investigate → inspect relevant files → determine cause → fix → run again → validate
```

Do NOT stop after the first failure and ask what to do. You are expected to troubleshoot normal engineering problems yourself: missing dependency (install it if genuinely required), type error, lint error, build error, broken import, test failure, runtime/hydration error, configuration issue, missing directory (create it), incorrect generated Figma code (adapt it to the architecture), obsolete generated component (refactor or remove it if consistent with the architecture).

## 3. Never Ask Routine Questions Either

Not "may I…", not "which do you prefer…", not "should I continue…". When something is unclear:

1. **Look it up:** `design/spec`, the screenshots, `docs/app/*`, these contracts.
2. **Choose** the option that matches the design and the contracts most closely.
3. **Record it** under **Decisions made** in `docs/app/build-log.md` (it feeds the final report).

## 4. One Continuous Run — Build Everything, Then Report

A request covers **the whole job**: Phase 0 design gathering (design-driven projects, [DESIGN-GATHERING.md](./DESIGN-GATHERING.md)) → **every stage** in `docs/app/build-plan.md`, in order → final verification → **one** final report. Do not stop between stages, do not ask whether to continue, do not wait for approval to start the next stage. (If the request names a narrower slice — "only the checkout stage", "only gather the design" — do just that slice.)

- **Stages are ordered work, not stopping points.** They exist for dependency order, acceptance criteria ("Done when:") and clean commits.
- **After each stage:** run `verify` ([verification-contract.md](./verification-contract.md)); if anything fails, fix → re-run → only then continue. Commit locally (`stage 3: checkout flow`). Append the stage to `docs/app/build-log.md` (built, decisions made, needs from you, checks marked `blocked`). Then start the next stage immediately.
- **Never carry a red stage forward.** A failing check is repaired before moving on. A check the environment itself blocks is marked `blocked: <reason>` in the log, and work continues.
- **Resume rule.** Runs can be interrupted (session limits, restarts). On start, read `docs/app/build-log.md` and `git log`, find the first incomplete stage and continue from there. Never redo finished stages and never restart the plan.
- **Each stage also** removes what the design removed in its area (code, tests, content, unused tokens), keeps every module that still exists working, and extends the architecture tests.
- **At the end:** run the full `verify` (plus e2e when configured) on the final tree, compare every screen with its screenshots, then write the final report (§6) — once.

## 5. The Only Hard Stops

| Action | Rule |
|---|---|
| `git push`, or any upload of code to a remote | **PROHIBITED.** Also blocked in `.claude/settings.json`. Don't ask whether to push, don't attempt it. |
| Irreversible actions outside the repo — **deployments** (`vercel`, `netlify`, `gh release`, CI triggers), publishing packages, store/marketplace submissions, deleting remote resources, running migrations against shared/production databases, sending real emails or SMS, live payments, paid services | **PROHIBITED** unless the build plan explicitly says to do it. |
| Something only the owner can supply (the design export when the plugin/MCP can't be reached, copy, translations, photos, API keys, DNS, vendor accounts) | Don't stop and don't invent it. Build the code path, use the documented fallback (e.g. English text, a placeholder env var in `.env.example`), keep going, and list it under **Needs from you**. |
| The design gate fails and cannot be repaired | Don't stop the run. Finish every stage that doesn't depend on the design, mark the dependent stages `blocked: design gate`, and report. Never invent the design. |
| The environment itself blocks a command | Determine what's blocked, record the exact limitation, continue with everything else, mark the affected check `blocked: <reason>`. Request user intervention only if an external action you cannot perform is genuinely required. |

**Commit ≠ push.** `git add . && git commit -m "…"` is allowed; `git push` is not. When the work is complete, leave the commits local and report: *"Implementation is complete. Changes have not been pushed."*

Safety is not a permission request: still respect the architecture, `docs/*`, security requirements, data protection and the irreversible-action rule above. Routine development needs no confirmation.

## 6. Final Report (written once, at the end of the run)

```
## Build complete — <product>
Stages: <n>/<n> done — 1 <name> ✓ <commit> · 2 <name> ✓ <commit> · …
Verify (final tree): typecheck ✓ · lint ✓ · tests ✓ (n passed) · design gate ✓ · theme check ✓ · build ✓ · e2e ✓   (✗ or "blocked: <reason>" or "n/a" where true)
Matches design: <screens compared at each designed width, light + dark; remaining visual differences>
Decisions made: <consolidated from build-log.md, each with a one-line reason>
Blocked / not done: <stage or check and why — or "nothing">
Needs from you: <assets/content/keys only the owner can provide — or "nothing">
Needs manual check: <what tests can't prove: real devices/browsers, screen readers, payment sandbox…>
Not pushed. Not deployed.
```

## 7. Working Style & Final Policy

Operate as an experienced engineer who owns the implementation: inspect before changing, reason before refactoring, reuse existing abstractions, follow `docs/*`, make technically sound decisions, test your work, fix your own errors, and continue until the whole requested job is complete. Behave like **an autonomous engineer with full development access, with pushing and external deployment explicitly disabled.**

| Action | Authorization |
|---|---|
| Read / search / inspect files and directories | ✅ Allowed |
| Shell, bash, terminal, scripts | ✅ Allowed |
| Create / modify / delete development files when necessary | ✅ Allowed |
| npm / pnpm / yarn / npx, install dependencies | ✅ Allowed |
| Run tests, type-check, lint, build, dev server, e2e | ✅ Allowed |
| Git status / diff / log, local branches, local commits | ✅ Allowed |
| `git push` or any equivalent remote code push | ❌ PROHIBITED |
| Deploy, publish, release, remote deletes, production DB changes, paid or real-world side effects | ❌ PROHIBITED (unless the build plan says so) |

**Start working immediately. Do not ask me for routine permissions. Do not push.**
