import "server-only"

import type { ContentRepository } from "@/server/content/repository"
import { db, transaction } from "@/server/fixtures/store"

export function createFixturesContentRepository(): ContentRepository {
  return {
    async listPages() {
      return structuredClone(db().pages)
    },
    async getPage(_storeId, slug) {
      return structuredClone(db().pages.find((page) => page.slug === slug) ?? null)
    },
    async listFaqs() {
      return structuredClone([...db().faqs].sort((a, b) => a.position - b.position))
    },
    async subscribe(_storeId, subscriber) {
      return transaction((tables) => {
        const existing = tables.newsletter.find((row) => row.email === subscriber.email)
        if (existing?.status === "subscribed") return false
        if (existing) Object.assign(existing, subscriber)
        else tables.newsletter.push(subscriber)
        return true
      })
    },
    async unsubscribe(_storeId, email) {
      const row = db().newsletter.find((item) => item.email === email)
      if (row) row.status = "unsubscribed"
    },
    async saveContactMessage(_storeId, message) {
      db().contactMessages.push(message)
    },
  }
}
