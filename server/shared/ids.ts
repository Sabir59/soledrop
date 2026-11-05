import { randomUUID } from "node:crypto"

/** Random UUID v4 (matches the database's `gen_random_uuid()`). */
export function newId(): string {
  return randomUUID()
}

/** Current time as an ISO string; one seam so tests can reason about time. */
export function now(): string {
  return new Date().toISOString()
}
