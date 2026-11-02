# 🧠 State Management Protocol

**Role:** You are a Lead State Architect for a Next.js (App Router) application. The established stack is **TanStack Query for server state**, **React Hook Form for form state**, the **URL for shareable view state**, and **React Context + `useReducer`/`useState` for app-wide singleton client state**. Zustand is not installed and stays that way until a real need for feature-local, non-singleton store state appears. Your goal is predictable state with the fewest moving parts, not maximal tooling.

---

## 1. Pick the Smallest Tier That Fits

| Tier | Where | Use for |
|---|---|---|
| URL state | path segments + `searchParams` (read in a feature hook with `useSearchParams`, or via the `searchParams` prop in a Server Component) | filters, sort, pagination, selected tab, anything the user should be able to link to, reload or Back-button into |
| Component UI state | `useState` in the feature hook | open/closed, hover reveal, a revealed answer before it's persisted |
| Form state | React Hook Form in `use-[x]-form.ts` | every field value (see [form contract](./form-and-validation-contract.md)) |
| Server state | TanStack Query in `hooks/api/[domain]/` | everything that comes from a backend |
| App-wide persisted client state | **one** `context/<Name>Context.tsx` + a pure reducer file | preferences, local progress, a local-only cart — anything that survives reloads and isn't server data |
| Theme | `next-themes` | light/dark/system (the only library allowed to own its own storage) |
| Zustand | not installed | only if a feature needs complex, feature-local, non-singleton state (§2) |

i. **Server data is never mirrored into Context or Zustand.** Read it from `useQuery`/`useMutation`. When a result becomes app-wide identity (e.g. login), the mutation's `onSuccess` pushes the *result* into the context setter or invalidates the relevant query key — the hook doesn't own that state machine.
ii. **Context is for state that (a) the whole app needs and (b) has a lifecycle** — hydration from storage, a state machine, persistence on change. It exposes exactly one `use[Name]()` hook that throws outside its Provider.
iii. **Trivial cross-tree UI state** (a single boolean read by a component that isn't a direct parent/child — a mobile nav sheet, say) is a plain `useState` inside a small Provider. Don't reach for `useReducer` or a library until the state grows more cases.
iv. **If it belongs in the URL, it does not belong in `useState`.** A filter that resets on reload or can't be shared is a bug.

## 2. When (and Only When) to Introduce Zustand

Zustand is **not a dependency yet** — don't add it speculatively. Reach for it only when a feature needs client state that is:

- local to one feature (if it's app-wide, it belongs in `context/` per §1.ii), AND
- too stateful for `useForm`/`useState` inside the feature's hook (a multi-step checkout wizard, a cart, a drag-and-drop board, filter drafts persisted across routes within one feature).

If that happens: one isolated slice per feature under `features/[feature]/store/`, never a shared "god store." **On the server, create the store per request and provide it through a Provider** — a module-level store is shared between users. Components subscribe with atomic selectors, never full-store destructuring:

- ❌ **BAD:** `const { items, totalPrice } = useCartStore();` (re-renders on any store change)
- ✅ **GOOD:** `const items = useCartStore((state) => state.items);`

State mutations live inside store actions — components never mutate store fields directly.

## 3. Persisted Client State — The Rules That Make It Reliable

1. **Single storage owner.** Only the persisted-state context touches `localStorage`. Everything else goes through its hook.
2. **Pure core.** State shape, defaults, reducer and a `normalize(saved)` function live in a pure `.ts` file with no React or browser imports, so they're unit-testable in Node.
3. **Hydration-safe start.** Initial state renders identically on the server and the client (`status: 'loading'`). Load in an effect, then dispatch. Never read storage during render or at module scope.
4. **Normalize, don't replace.** Validate saved data field by field. Keep every valid field and default only the invalid ones. Never wipe saved data because one field is bad.
5. **A failed read is not an empty read.** If loading fails (parse error, `SecurityError` in private mode, blocked storage), don't write defaults over what's stored.
6. **Serialized writes.** Writes go through a queue, one at a time, in order. A failed write (quota, blocked storage) keeps the in-memory state, exposes a retry, and never throws into the UI. Wrap every storage call in `try/catch`.
7. **Versioned key.** Store under a versioned key (e.g. `app:state:v1`) with a `migrate()` function for the next version; migrations are idempotent and tested.
8. **Cross-tab consistency (when it matters).** Listen to the `storage` event inside the context and re-run `normalize` on the new value; never let two tabs overwrite each other blindly.

## 4. Hydration Safety (Server Rendering)

Server Components and Client Components are both rendered on the server first, so the client's first render must match that HTML — the same hydration-mismatch risk applies everywhere in this app.

i. **Zero hydration mismatch:** anything that can differ between server and client (persisted state, theme, locale formatting, time zone, `window` size, `Date.now()`, `Math.random()`, `navigator`) must not decide what's rendered on the first frame. Start in a neutral state and resolve it in an effect — consumers render the neutral/skeleton state while `status === 'loading'` rather than guessing.
ii. **Shape for any new persisted context:** initial state that renders identically everywhere → async load in `useEffect` → dispatch the real state once resolved.
iii. **No `typeof window !== 'undefined'` branches in render output.** Use an effect, `useSyncExternalStore` with a server snapshot, or move the code into a Client Component that renders after mount.
iv. **Data needed on the first server render lives in cookies, not `localStorage`** (theme, locale, session). The server can read cookies via `cookies()`; it can't read storage. `next-themes` handles theme — `suppressHydrationWarning` on `<html>` is allowed for that one purpose and nowhere else.
v. **No mutable module-level state on the server.** A `let currentUser` or a shared cache object at module scope is shared by every request. Per-request values flow through function arguments, `cache()`, or Providers.

## 5. Server State on Next.js (TanStack Query)

i. **One factory, two environments.** `lib/query-client.ts` exports `getQueryClient()`: on the **server** it returns a **new** `QueryClient` per call (never share data across requests); in the **browser** it returns a single module-level instance (so React suspending during the first render can't recreate it). Set a default `staleTime` above 0 (e.g. 60 s) so the client doesn't refetch what the server just sent.
ii. **Provider:** one `components/shared/providers.tsx` (`"use client"`) wraps the app in `QueryClientProvider` (and the theme provider). It is the only place the client is provided.
iii. **Query definitions:** `hooks/api/[domain]/queries.ts` exports `queryOptions` factories (no directive, no hooks); `use[Action].ts` files wrap them.
iv. **Prefetch in a Server Component** (optional, for first-paint data): create a client with `getQueryClient()`, prefetch with the exported `queryOptions` (e.g. `queryClient.prefetchQuery(productQueryOptions(id))`), render `<HydrationBoundary state={dehydrate(queryClient)}>` around the feature component. The Server Component does not render the result itself. To stream instead of awaiting, start the prefetch without `await` and dehydrate pending queries (`shouldDehydrateQuery` including `status === 'pending'`), then read with `useSuspenseQuery` in the client component.
v. **Never fetch in a `queryFn` through a Server Action** (Actions run serially). `queryFn` calls `api/*.ts`, which calls a route handler or `fetch`.
vi. **Mutations** invalidate or update keys in `onSuccess`; they don't hand-edit unrelated caches. Optimistic updates roll back in `onError`.

## 6. Storage & Sensitive Data

i. `localStorage` is fine for non-sensitive preferences. Don't add a bespoke storage abstraction unless a real need (IndexedDB for large data, say) appears.
ii. **Sensitive tokens never touch client storage or context.** Sessions live in `httpOnly`, `secure`, `sameSite` cookies set by the server (`lib/auth/*`, `server-only`). The client sees a DTO (id, display name, role), delivered via a Server Component prop or a query.
iii. **Zero module-scope storage access:** never call `localStorage.getItem(...)` at module evaluation time — only inside an effect or action.

## 7. Singleton Resource-Lifecycle Contexts (audio, speech, media, sockets, geolocation)

A browser resource that must have exactly one live session app-wide gets its own context, separate from the persisted-state context.

i. **One owner of the session.** Starting playback/recording/streaming anywhere stops the previous one. Components ask the context's hook to start or stop; they never create the underlying `Audio`, `SpeechSynthesisUtterance`, `MediaRecorder`, `WebSocket` or `EventSource` themselves.
ii. **Stop and clean up** on `visibilitychange`/`pagehide` (tab hidden or closed), on route change away from the owner, and on unmount. Browsers throttle or kill background media and sockets and leave the UI stuck on "playing" if you don't.
iii. **Missing capability or denied permission is a recoverable state**, not a crash: feature-detect inside an effect (`'speechSynthesis' in window`, `navigator.mediaDevices`), and expose a user-visible message plus a retry. Autoplay policies mean playback must start from a user gesture.
iv. **Pure ownership logic** (who owns the session, when it is cancelled) lives in a pure `.ts` file driven by an adapter, so it is unit-testable without a browser.

## 8. Execution & Verification Protocol

- **Step 1:** Decide the tier — URL, component, form, server data (TanStack Query hook), app-wide singleton (context), trivial cross-tree flag (context + `useState`), or feature-local complex state (Zustand, only once justified per §2).
- **Step 2:** For context: define the state shape, write the pure reducer + `normalize`, expose one `use[Name]()` hook, and if persisted follow §3 and §4.
- **Step 3:** For server state: one `queries.ts` factory + one `use[Action].ts` hook per action, wrapping one `api/[domain].ts` function; wire any app-wide consequence through the context setter or key invalidation in `onSuccess`.
- **Step 4:** Unit-test the pure core (reducer, `normalize`, migrations, write queue) against the real modules; see [verification-contract.md](./verification-contract.md).
