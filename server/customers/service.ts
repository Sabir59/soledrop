import "server-only"

import { createHash, randomBytes } from "node:crypto"

import type { CustomerRepository } from "@/server/customers/repository"
import { decoyHash, hashPassword, verifyPassword } from "@/server/customers/password"
import type { Customer, CustomerProfile } from "@/server/customers/types"
import type { Address, Order } from "@/server/orders/types"
import type { EventTopic } from "@/server/platform/types"
import { DomainError } from "@/server/shared/errors"
import { newId, now } from "@/server/shared/ids"

export const SESSION_DAYS = 30
const RESET_MINUTES = 30

type Deps = {
  customers: CustomerRepository
  publish: (topic: EventTopic, payload: Record<string, unknown>) => Promise<unknown>
  orders: { listForCustomer: (storeId: string, customerId: string) => Promise<Order[]>; anonymiseCustomer: (customerId: string) => Promise<number> }
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex")
const newToken = () => randomBytes(32).toString("base64url")

export function toProfile(customer: Customer): CustomerProfile {
  return {
    id: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    phone: customer.phone,
    group: customer.group,
    marketingOptIn: customer.marketingOptIn,
    createdAt: customer.createdAt,
  }
}

export function createCustomerService(deps: Deps) {
  const { customers } = deps

  async function startSession(customerId: string) {
    const token = newToken()
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()
    await customers.createSession({ tokenHash: hash(token), customerId, createdAt: now(), expiresAt })
    return { token, expiresAt }
  }

  return {
    async register(storeId: string, input: { email: string; password: string; fullName: string; marketingOptIn: boolean }) {
      const customer = await customers.create({
        id: newId(),
        storeId,
        email: input.email.trim().toLowerCase(),
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName.trim(),
        phone: null,
        group: "retail",
        marketingOptIn: input.marketingOptIn,
        createdAt: now(),
        deletionRequestedAt: null,
      })
      await deps.publish("customer.registered", { customerId: customer.id, email: customer.email, fullName: customer.fullName })
      return { customer: toProfile(customer), session: await startSession(customer.id) }
    },

    /** Same error and similar timing for unknown email and wrong password. */
    async login(storeId: string, emailAddress: string, password: string) {
      const customer = await customers.findByEmail(storeId, emailAddress.trim().toLowerCase())
      const valid = await verifyPassword(password, customer?.passwordHash || (await decoyHash()))
      if (!customer || !valid || customer.deletionRequestedAt) throw new DomainError("unauthorized", "That email and password don't match.")
      return { customer: toProfile(customer), session: await startSession(customer.id) }
    },

    logout: (token: string) => customers.deleteSession(hash(token)),

    /** Resolves a session cookie to its customer; null for expired, unknown or deleted accounts. */
    async fromSession(token: string | undefined): Promise<Customer | null> {
      if (!token) return null
      const session = await customers.findSession(hash(token))
      if (!session) return null
      const customer = await customers.findById(session.customerId)
      return customer && !customer.deletionRequestedAt ? customer : null
    },

    /** Always succeeds from the caller's view, so it can't be used to discover accounts. */
    async requestPasswordReset(storeId: string, emailAddress: string) {
      const customer = await customers.findByEmail(storeId, emailAddress.trim().toLowerCase())
      if (!customer || customer.deletionRequestedAt) return
      const token = newToken()
      await customers.createReset({ tokenHash: hash(token), customerId: customer.id, expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString(), usedAt: null })
      await deps.publish("password.reset_requested", { customerId: customer.id, email: customer.email, token })
    },

    async resetPassword(token: string, password: string) {
      const reset = await customers.consumeReset(hash(token))
      if (!reset) throw new DomainError("validation", "This reset link has expired or was already used. Ask for a new one.")
      await customers.update(reset.customerId, { passwordHash: await hashPassword(password) })
      await customers.deleteSessionsFor(reset.customerId)
      return startSession(reset.customerId)
    },

    async changePassword(customer: Customer, current: string, next: string) {
      if (!(await verifyPassword(current, customer.passwordHash))) throw new DomainError("validation", "Your current password is incorrect.", { field: "currentPassword" })
      await customers.update(customer.id, { passwordHash: await hashPassword(next) })
      await customers.deleteSessionsFor(customer.id)
      return startSession(customer.id)
    },

    async updateProfile(customerId: string, changes: { fullName?: string; phone?: string | null; marketingOptIn?: boolean }) {
      return toProfile(await customers.update(customerId, changes))
    },

    listAddresses: (customerId: string) => customers.listAddresses(customerId),
    saveAddress: (customerId: string, address: Address & { id?: string; isDefault: boolean }) => customers.saveAddress(customerId, address),
    deleteAddress: (customerId: string, addressId: string) => customers.deleteAddress(customerId, addressId),

    /** Right of access: everything held about the customer, as JSON. */
    async exportData(customer: Customer) {
      const [addresses, orders] = await Promise.all([customers.listAddresses(customer.id), deps.orders.listForCustomer(customer.storeId, customer.id)])
      return {
        exportedAt: now(),
        profile: toProfile(customer),
        addresses,
        orders: orders.map(({ accessTokenHash: _hidden, idempotencyKey: _key, ...order }) => order),
      }
    },

    /** Right to erasure: scrub the profile and anonymise orders (amounts stay for accounting). */
    async deleteAccount(customer: Customer, password: string) {
      if (!(await verifyPassword(password, customer.passwordHash))) throw new DomainError("validation", "Your password is incorrect.", { field: "password" })
      await deps.orders.anonymiseCustomer(customer.id)
      await customers.scrub(customer.id)
    },
  }
}

export type CustomerService = ReturnType<typeof createCustomerService>
