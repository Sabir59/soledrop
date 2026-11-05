// SWAP → none: talks to the real BFF (`app/api/search/*`).
import { request } from "@/api/http"
import type { SuggestResponse } from "@/features/search/types"

export const searchApi = {
  suggest: (q: string, signal?: AbortSignal) => request<SuggestResponse>(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal }),
  logClick: (query: string, slug: string) => request<void>("/api/search/events", { method: "POST", body: { kind: "click", query, slug } }),
  logSearch: (query: string) => request<void>("/api/search/events", { method: "POST", body: { kind: "search", query } }),
}
