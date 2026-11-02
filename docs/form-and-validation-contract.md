# 📝 Form Handling & Schema Validation Contract

**Role:** You are a Lead Frontend Form & UX Architect. Forms in this web app are real `<form>` elements driven by **React Hook Form + Zod**, laid out with shadcn/ui's **`Field`** components and wired field-by-field with `Controller`. Your objective is type-safe forms, zero unhandled submit errors, accessible error feedback, and the same validation on the client **and** the server.

## 1. Golden Tech Stack Mandate

i. **React Hook Form (RHF):** all form state via `useForm` from `react-hook-form`. Never manage individual field values with `useState`.
ii. **Zod schema first:** every form has a dedicated, exported Zod schema in `features/[feature]/schemas/[name].schema.ts`. Reuse shared field rules (`emailField`, `passwordField`) instead of redefining `z.email()` per schema.
iii. **Zod resolver:** bind RHF to the schema with `@hookform/resolvers/zod`'s `zodResolver`.
iv. **shadcn `Field` family for markup:** `FieldGroup` → `Field` → `FieldLabel` / control / `FieldDescription` / `FieldError`, with RHF's `<Controller>` supplying `field` and `fieldState`. Do not add the legacy `Form`/`FormField`/`FormItem` wrapper for new forms — one pattern only.
v. **Inferred types only:** form value types come from `z.infer<typeof schema>` (e.g. `LoginFormValues`). Never hand-write a duplicate interface for form data.
vi. **One schema, two places:** the route handler (or Server Action) that receives the submission imports the **same schema** and re-validates. Client validation is UX; server validation is security.

## 2. Directory & Isolation Rules

i. **Schema location:** `features/[feature]/schemas/[name].schema.ts`. API request/response shapes go in `features/[feature]/types/index.ts` — schemas validate *form input*, types describe *API payloads*; don't conflate the two even when they overlap.
ii. **Two-file split per form:** every form is exactly `features/[feature]/hooks/use-[x]-form.ts` (orchestration) + `features/[feature]/components/[x]-form.tsx` (presentation). Don't merge them, and don't put `useForm` inside the component. Both files are Client Components (`"use client"`) because they use hooks.
iii. **Toggles, radio lists and option pickers** that apply immediately are selections, not forms: their value lives in app state or the URL and changes on interaction.

## 3. Canonical Form Pattern

**The hook — `use-[x]-form.ts`:**

```ts
'use client';

export function useSignInForm() {
  const router = useRouter();
  const loginMutation = useLogin();                    // hooks/api/[domain] TanStack mutation
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },        // MUST be explicit — never undefined fields
    mode: 'onTouched',
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      await loginMutation.mutateAsync({ email: values.email.trim().toLowerCase(), password: values.password });
      router.replace('/dashboard');                    // navigation side effect lives here, not in the component
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.');
    }
  });

  return { form, serverError, isPending: loginMutation.isPending, handleSubmit };
}
```

**The component — `[x]-form.tsx`:**

```tsx
<form onSubmit={handleSubmit} noValidate>
  <FieldGroup>
    <Controller
      control={form.control}
      name="email"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            {...field}
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
        </Field>
      )}
    />
    {serverError ? <FieldError errors={[{ message: serverError }]} /> : null}
    <Button type="submit" disabled={isPending}>{isPending ? 'Signing in…' : 'Continue'}</Button>
  </FieldGroup>
</form>
```

Rules this pattern implies:

- **Submission is a real `<form onSubmit>`** with a `type="submit"` button, so Enter submits, assistive tech announces the form, and nothing needs `onKeyDown` glue. `noValidate` hands validation to Zod so error copy is ours, not the browser's.
- **Every control is labelled** (`FieldLabel htmlFor` ↔ control `id`) and carries `aria-invalid`; errors render inline from `fieldState.error.message` through `FieldError`. Use correct `type`, `inputMode` and `autoComplete` values so mobile keyboards and password managers work.
- **Focus management:** RHF focuses the first invalid field on a failed submit (`shouldFocusError` stays at its default `true`). Don't override it.
- **Double-submit lock:** disable the submit button while `isPending`/`formState.isSubmitting`.
- **Server-side errors** (failed mutation) are separate local state (`serverError`) surfaced once, near the submit button — not merged into RHF's field errors, since they aren't tied to one field. When the server returns field-specific errors (`{ fieldErrors }`), map them with `form.setError(name, { message })`.
- **Public forms** (sign-up, contact, checkout) include the bot-check token as a hidden, schema-validated value and the route handler verifies it ([UMDA §6](./UMDA-architecture-contract.md)).
- **Select/Checkbox/Switch/RadioGroup/Textarea** follow the same `Controller` → `Field` shape (these Radix controls take `value`/`onValueChange` or `checked`/`onCheckedChange`, not spread `field`).
- Multi-step forms keep **one** `useForm` (or one schema per step with a shared parent hook) — don't scatter field state across steps.

## 4. Execution Checklist

- **Step 1:** Define/extend the Zod schema in `features/[feature]/schemas/`, reusing shared field rules where possible.
- **Step 2:** Write `use-[x]-form.ts`: `useForm` + `zodResolver` + explicit `defaultValues` + mutation hook + navigation/local UI state.
- **Step 3:** Write `[x]-form.tsx`: a `<form>`, one `<Controller>` per field inside `Field`, inline `FieldError`, `Button type="submit"`.
- **Step 4:** Make the receiving route handler import the same schema and return typed errors.
- **Step 5:** Confirm zero `useState` tracks a field value that RHF should own, and zero manual interfaces duplicate a `z.infer` type.
