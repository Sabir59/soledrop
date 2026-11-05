import type { SearchEvent, SynonymGroup, TrendingQuery } from "@/server/search/types"

export interface SearchRepository {
  listSynonyms(storeId: string): Promise<SynonymGroup[]>
  /** Appends a search or click event; never read back by shoppers. */
  logEvent(storeId: string, event: SearchEvent): Promise<void>
  /** Most frequent searches that found something within the last `days`, most searched first. */
  trending(storeId: string, days: number, limit: number): Promise<TrendingQuery[]>
}
