import "server-only"

import { db } from "@/server/fixtures/store"
import type { PlatformRepository } from "@/server/platform/repository"
import { newId, now } from "@/server/shared/ids"

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

export function createFixturesPlatformRepository(): PlatformRepository {
  return {
    async listFlags() {
      return db().flags
    },
    async enqueue(_storeId, topic, payload) {
      const event = { id: newId(), topic, payload, status: "pending" as const, attempts: 0, availableAt: now(), createdAt: now(), lastError: null }
      db().outbox.push(event)
      return event
    },
    async claimDue(limit) {
      const at = Date.now()
      return db()
        .outbox.filter((event) => event.status === "pending" && Date.parse(event.availableAt) <= at)
        .slice(0, limit)
        .map((event) => {
          event.attempts += 1
          event.availableAt = new Date(at + 60_000).toISOString()
          return structuredClone(event)
        })
    },
    async markDelivered(id) {
      const event = db().outbox.find((row) => row.id === id)
      if (event) event.status = "delivered"
    },
    async markFailed(id, error, maxAttempts) {
      const event = db().outbox.find((row) => row.id === id)
      if (!event) return
      event.lastError = error
      if (event.attempts >= maxAttempts) event.status = "failed"
      else event.availableAt = new Date(Date.now() + 2 ** event.attempts * 30_000).toISOString()
    },
    async recordDelivery(delivery) {
      db().webhookDeliveries.push(delivery)
    },
    async audit(entry) {
      db().audit.push({ ...entry, id: newId(), at: now() })
    },
    async listAudit(entity, entityId) {
      return db().audit.filter((entry) => entry.entity === entity && entry.entityId === entityId)
    },
    async hit(key, windowSeconds) {
      const limits = db().rateLimits
      const windowStart = Math.floor(Date.now() / (windowSeconds * 1000))
      const current = limits.get(key)
      const next = current && current.windowStart === windowStart ? { windowStart, count: current.count + 1 } : { windowStart, count: 1 }
      limits.set(key, next)
      return next.count
    },
    async getIdempotent(key) {
      const entry = db().idempotency.get(key)
      if (!entry || Date.now() - entry.at > IDEMPOTENCY_TTL_MS) return null
      return { status: entry.status, body: entry.body }
    },
    async saveIdempotent(key, status, body) {
      db().idempotency.set(key, { status, body, at: Date.now() })
    },
    async ping() {
      return Array.isArray(db().products)
    },
  }
}
