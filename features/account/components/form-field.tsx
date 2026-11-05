"use client"

import { useState, type InputHTMLAttributes, type ReactNode } from "react"
import type { z } from "zod"

import { ApiError } from "@/api/http"
import { cn } from "@/lib/utils"

export const control =
  "h-14 w-full rounded-lg border-2 border-control-border bg-background px-4 text-18 transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive md:h-15"

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; error?: string; hint?: ReactNode; formId: string }

/** Label, input, optional hint and the field's error, wired together for assistive tech. */
export function FormField({ name, label, error, hint, formId, className, ...input }: FieldProps) {
  const id = `${formId}-${name}`
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-18 font-bold md:text-20">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-16 text-subtle-foreground">
          {hint}
        </p>
      ) : null}
      <input id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn(control, className)} {...input} />
      {error ? (
        <p id={`${id}-error`} className="text-16 font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-16 font-medium text-destructive empty:hidden">
      {children}
    </p>
  )
}

/**
 * Client-side validation with the API's own schema: per-field messages, focus on the first
 * invalid field, and server field errors (422) mapped back onto the same fields.
 */
export function useSchemaForm<Schema extends z.ZodType>(schema: Schema) {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)

  function validate(form: HTMLFormElement, values: unknown): z.infer<Schema> | null {
    const parsed = schema.safeParse(values)
    if (parsed.success) {
      setErrors({})
      setFormError(null)
      return parsed.data
    }
    const next: Record<string, string> = {}
    for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message
    setErrors(next)
    const first = [...form.elements].find((element) => element instanceof HTMLElement && "name" in element && next[(element as HTMLInputElement).name])
    ;(first as HTMLElement | undefined)?.focus()
    return null
  }

  function fail(failure: unknown) {
    if (failure instanceof ApiError && Object.keys(failure.fields).length) {
      setErrors(Object.fromEntries(Object.entries(failure.fields).map(([key, messages]) => [key, messages?.[0]])))
    }
    setFormError(failure instanceof ApiError ? failure.message : "Something went wrong. Please try again.")
  }

  return { errors, formError, validate, fail }
}
