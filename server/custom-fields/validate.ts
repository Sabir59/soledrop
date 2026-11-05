import type { CustomFieldDefinition } from "@/server/catalog/types"
import { DomainError } from "@/server/shared/errors"

export type CustomFieldValues = Record<string, string | number | boolean>

const MAX_TEXT = 500

function coerce(definition: CustomFieldDefinition, raw: unknown): string | number | boolean {
  switch (definition.type) {
    case "number": {
      const value = typeof raw === "number" ? raw : Number(raw)
      if (!Number.isFinite(value)) throw new DomainError("validation", `${definition.label} must be a number.`, { field: definition.code })
      return value
    }
    case "boolean":
      if (typeof raw === "boolean") return raw
      if (raw === "true" || raw === "false") return raw === "true"
      throw new DomainError("validation", `${definition.label} must be yes or no.`, { field: definition.code })
    case "date": {
      const value = String(raw)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
        throw new DomainError("validation", `${definition.label} must be a date.`, { field: definition.code })
      }
      return value
    }
    case "url": {
      const value = String(raw)
      if (!URL.canParse(value) || !/^https?:/.test(value)) throw new DomainError("validation", `${definition.label} must be a web address.`, { field: definition.code })
      return value
    }
    default: {
      const value = String(raw).trim()
      if (value.length > MAX_TEXT) throw new DomainError("validation", `${definition.label} must be ${MAX_TEXT} characters or fewer.`, { field: definition.code })
      return value
    }
  }
}

/**
 * Validates values against the store's custom-field definitions for one entity. Unknown keys
 * are dropped (never stored), empty optional values are omitted, and required ones must be set.
 */
export function validateCustomFields(
  definitions: CustomFieldDefinition[],
  entity: CustomFieldDefinition["entity"],
  input: Record<string, unknown> | undefined,
): CustomFieldValues {
  const result: CustomFieldValues = {}
  for (const definition of definitions.filter((item) => item.entity === entity)) {
    const raw = input?.[definition.code]
    const empty = raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")
    if (empty) {
      if (definition.required) throw new DomainError("validation", `${definition.label} is required.`, { field: definition.code })
      continue
    }
    result[definition.code] = coerce(definition, raw)
  }
  return result
}
