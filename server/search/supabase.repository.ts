import "server-only"

import { supabase, unwrap } from "@/server/db/supabase"
import type { SearchRepository } from "@/server/search/repository"
import type { SynonymGroup, TrendingQuery } from "@/server/search/types"

export function createSupabaseSearchRepository(): SearchRepository {
  return {
    async listSynonyms(storeId) {
      return unwrap(await supabase().from("search_synonyms").select("id, term, synonyms").eq("store_id", storeId).order("term")) as SynonymGroup[]
    },
    async logEvent(storeId, event) {
      unwrap(
        await supabase().from("search_queries").insert({
          id: event.id,
          store_id: storeId,
          query: event.query,
          normalized: event.normalized,
          result_count: event.resultCount,
          clicked_slug: event.clickedSlug,
          source: event.source,
          created_at: event.createdAt,
        }),
      )
    },
    async trending(storeId, days, limit) {
      const rows = unwrap(await supabase().rpc("search_trending", { p_store_id: storeId, p_days: days, p_limit: limit })) as { query: string; count: number }[]
      return rows.map((row): TrendingQuery => ({ query: row.query, count: Number(row.count) }))
    },
  }
}
