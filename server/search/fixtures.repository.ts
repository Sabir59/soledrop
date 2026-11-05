import "server-only"

import { db } from "@/server/fixtures/store"
import type { SearchRepository } from "@/server/search/repository"

export function createFixturesSearchRepository(): SearchRepository {
  return {
    async listSynonyms() {
      return structuredClone(db().searchSynonyms)
    },
    async logEvent(_storeId, event) {
      db().searchEvents.push(structuredClone(event))
    },
    async trending(_storeId, days, limit) {
      const since = Date.now() - days * 86_400_000
      const counts = new Map<string, number>()
      for (const event of db().searchEvents) {
        if (event.clickedSlug !== null || !event.resultCount || Date.parse(event.createdAt) < since) continue
        counts.set(event.normalized, (counts.get(event.normalized) ?? 0) + 1)
      }
      return [...counts]
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query))
        .slice(0, limit)
    },
  }
}
