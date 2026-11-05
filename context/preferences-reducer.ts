import type { ViewedProduct } from "@/features/search/types"

/**
 * Device-local shopper preferences: recent searches, recently viewed pairs and dismissed notices.
 * Pure (no storage access) so it is unit-tested directly; PreferencesContext persists it.
 */
export const PREFERENCES_KEY = "sd:preferences:v1"
export const PREFERENCES_VERSION = 1
export const MAX_RECENT_SEARCHES = 6
export const MAX_RECENTLY_VIEWED = 8
const MAX_QUERY_LENGTH = 80

export type PreferencesState = {
  version: typeof PREFERENCES_VERSION
  recentSearches: string[]
  recentlyViewed: ViewedProduct[]
  dismissed: string[]
}

export type PreferencesAction =
  | { type: "hydrate"; state: PreferencesState }
  | { type: "search"; query: string }
  | { type: "forgetSearch"; query: string }
  | { type: "clearSearches" }
  | { type: "viewed"; product: ViewedProduct }
  | { type: "dismiss"; id: string }

export const initialPreferences: PreferencesState = { version: PREFERENCES_VERSION, recentSearches: [], recentlyViewed: [], dismissed: [] }

const sameQuery = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase()

const isString = (value: unknown): value is string => typeof value === "string"

function isViewedProduct(value: unknown): value is ViewedProduct {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  const price = item.price as Record<string, unknown> | undefined
  const image = item.image as Record<string, unknown> | null | undefined
  return (
    isString(item.slug) &&
    /^[a-z0-9-]{1,120}$/.test(item.slug) &&
    isString(item.title) &&
    isString(item.brand) &&
    (image === null || (!!image && isString(image.url) && image.url.startsWith("/") && isString(image.alt))) &&
    !!price &&
    typeof price.amount === "number" &&
    (price.compareAt === null || typeof price.compareAt === "number") &&
    isString(price.currency)
  )
}

/**
 * Whatever is in storage (another version, a hand edit, a different tab's bug) becomes a valid
 * state: unknown versions reset, bad entries are dropped, lists are de-duplicated and capped.
 */
export function normalize(raw: unknown): PreferencesState {
  if (!raw || typeof raw !== "object" || (raw as { version?: unknown }).version !== PREFERENCES_VERSION) return initialPreferences
  const value = raw as Record<string, unknown>
  const searches = (Array.isArray(value.recentSearches) ? value.recentSearches : [])
    .filter(isString)
    .map((query) => query.trim().slice(0, MAX_QUERY_LENGTH))
    .filter(Boolean)
  const viewed = (Array.isArray(value.recentlyViewed) ? value.recentlyViewed : []).filter(isViewedProduct)
  return {
    version: PREFERENCES_VERSION,
    recentSearches: searches.filter((query, index) => searches.findIndex((other) => sameQuery(other, query)) === index).slice(0, MAX_RECENT_SEARCHES),
    recentlyViewed: viewed.filter((item, index) => viewed.findIndex((other) => other.slug === item.slug) === index).slice(0, MAX_RECENTLY_VIEWED),
    dismissed: [...new Set((Array.isArray(value.dismissed) ? value.dismissed : []).filter(isString))],
  }
}

export function preferencesReducer(state: PreferencesState, action: PreferencesAction): PreferencesState {
  switch (action.type) {
    case "hydrate":
      return normalize(action.state)
    case "search": {
      const query = action.query.trim().slice(0, MAX_QUERY_LENGTH)
      if (!query) return state
      return { ...state, recentSearches: [query, ...state.recentSearches.filter((item) => !sameQuery(item, query))].slice(0, MAX_RECENT_SEARCHES) }
    }
    case "forgetSearch":
      return { ...state, recentSearches: state.recentSearches.filter((item) => !sameQuery(item, action.query)) }
    case "clearSearches":
      return { ...state, recentSearches: [] }
    case "viewed":
      if (!isViewedProduct(action.product)) return state
      return { ...state, recentlyViewed: [action.product, ...state.recentlyViewed.filter((item) => item.slug !== action.product.slug)].slice(0, MAX_RECENTLY_VIEWED) }
    case "dismiss":
      return state.dismissed.includes(action.id) ? state : { ...state, dismissed: [...state.dismissed, action.id] }
  }
}
