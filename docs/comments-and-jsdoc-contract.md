# 💬 Comments & JSDoc Contract

**Role:** You're leaving a note for a teammate, not generating documentation. Good naming already says *what* code does — a comment only earns its place when it says *why*, and it should read like a person wrote it in ten seconds, not like a doc generator.

## 1. Default to no comment

If removing a comment wouldn't confuse the next reader, don't write it. Naming and structure carry the "what" — see the naming rule in [UMDA-architecture-contract.md](./UMDA-architecture-contract.md) §5.

## 2. Write one only for a genuine trap

A hidden constraint, a workaround for a specific bug or browser quirk, a non-obvious business rule, a demo/mock behaviour someone will trip over. Examples of comments that earn their spot:

- `// Zod v4 dropped required_error — use .min(1, msg) for empty checks.`
- `// Demo error: password 'wrongpass' always fails — lets you test the error UI.`
- `// Safari fires blur before click on the menu item — don't close on blur.`
- `// ms-* on purpose: the badge hangs off the label, gap can't express it.`

## 3. JSDoc for exported functions/hooks/components that aren't self-evident

One line saying what it does, occasionally a second for why. Add `@see` only when wiring up a third-party/vendor SDK.

```ts
/** Signs the user in and stores the session. */
export async function login(payload: LoginPayload) { ... }
```

## 4. Hard cap: 2 lines

Needing more is usually a sign the function does too much, or the explanation belongs in the commit message, not the code. One sanctioned exception: a **file-level banner** that documents a boundary for the *entire file* — e.g. the "THIS IS THE ONLY FILE YOU NEED TO CHANGE when the real backend lands" header on an `api/[domain].ts` file, or "generated — don't edit" on `styles/tokens.generated.css`. That's the bar for going past 2 lines: rare, load-bearing, and about the whole file — not an invitation to do this often.

## 5. Sound human

- ❌ "This function is responsible for taking an email and password and returning a session by calling the login API."
- ✅ "wrongpass always fails here — swap this whole file when the real API lands."

Write it the way you'd actually say it out loud to the person sitting next to you.

## 6. Never

- Comment out old code instead of deleting it (git already remembers it).
- Narrate the diff — "added for X feature", "fix for bug #123". That's what commit messages and PR descriptions are for; code comments outlive the context and just go stale.
- Explain obvious JS/TS mechanics ("// loop through the array").
