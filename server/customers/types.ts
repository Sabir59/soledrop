import type { Address } from "@/server/orders/types"

export type CustomerGroup = "retail" | "wholesale"

export type Customer = {
  id: string
  storeId: string
  email: string
  passwordHash: string
  fullName: string
  phone: string | null
  group: CustomerGroup
  marketingOptIn: boolean
  createdAt: string
  /** Set when the customer asks to delete their account; personal data is scrubbed by a job. */
  deletionRequestedAt: string | null
}

export type CustomerAddress = Address & { id: string; customerId: string; isDefault: boolean }

export type Session = { tokenHash: string; customerId: string; createdAt: string; expiresAt: string }

export type PasswordReset = { tokenHash: string; customerId: string; expiresAt: string; usedAt: string | null }

export type StaffRole = { userId: string; storeId: string; role: "owner" | "admin" | "staff" | "support" }

/** What the storefront sees of a customer (never the hash). */
export type CustomerProfile = {
  id: string
  email: string
  fullName: string
  phone: string | null
  group: CustomerGroup
  marketingOptIn: boolean
  createdAt: string
}
