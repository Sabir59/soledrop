"use client"

import { keepPreviousData, queryOptions, useMutation, useQuery } from "@tanstack/react-query"

import { searchApi } from "@/api/search"

export const searchKeys = { suggest: (q: string) => ["search", "suggest", q] as const }

/**
 * Overlay suggestions for a (debounced, trimmed) query. Each query is cached for a minute, so
 * backspacing is instant; the previous answer stays on screen while the next one loads; a newer
 * query aborts the request in flight (React Query cancels a query whose signal was read once
 * its last observer leaves).
 */
export const suggestOptions = (q: string) =>
  queryOptions({
    queryKey: searchKeys.suggest(q),
    queryFn: ({ signal }) => searchApi.suggest(q, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  })

export function useSuggest(q: string, enabled: boolean) {
  return useQuery({ ...suggestOptions(q), enabled })
}

/** Fire-and-forget analytics; failures are ignored so search never breaks over a log write. */
export function useSearchEvents() {
  const click = useMutation({ mutationFn: ({ query, slug }: { query: string; slug: string }) => searchApi.logClick(query, slug) })
  const search = useMutation({ mutationFn: (query: string) => searchApi.logSearch(query) })
  return { logClick: click.mutate, logSearch: search.mutate }
}
