/** Where a search was made: the header overlay (as-you-type) or the /search results page. */
export type SearchSource = "overlay" | "page"

/** One logged search, or one click on a result (then `clickedSlug` is set and `resultCount` is null). */
export type SearchEvent = {
  id: string
  query: string
  /** fold(query): what trending and zero-result reports group by. */
  normalized: string
  resultCount: number | null
  clickedSlug: string | null
  source: SearchSource
  createdAt: string
}

/** A merchant-managed synonym group: searching any of the words finds the others. */
export type SynonymGroup = { id: string; term: string; synonyms: string[] }

export type TrendingQuery = { query: string; count: number }
