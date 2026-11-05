import { z } from "zod"

import { CONDITION_GRADES, type ConditionGrade, type ProductQuery, type SortKey } from "@/server/catalog/types"

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
]

type Params = Record<string, string | string[] | undefined> | URLSearchParams

const list = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value : value ? [value] : []).flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean)

const major = z.coerce.number().int().nonnegative().max(10_000_000)

/**
 * Listing URLs are the source of truth for filters (shareable, back-button safe):
 * `?kind=new&gender=men&size=42,43&brand=nike&min=5000&max=17000&condition=excellent&sort=newest&page=2&q=air`.
 * Prices in the URL are whole rupees; the query carries minor units.
 */
export function parseProductQuery(params: Params): ProductQuery {
  const get = (key: string) => (params instanceof URLSearchParams ? (params.getAll(key).length ? params.getAll(key) : undefined) : params[key])
  const first = (key: string) => list(get(key))[0]
  const min = major.safeParse(first("min"))
  const max = major.safeParse(first("max"))
  const page = z.coerce.number().int().min(1).max(500).safeParse(first("page"))
  const sort = SORT_OPTIONS.find((option) => option.value === first("sort"))?.value
  const genders = list(get("gender")).filter((value): value is "men" | "women" | "kids" | "unisex" => ["men", "women", "kids", "unisex"].includes(value))
  const conditions = list(get("condition")).filter((value): value is ConditionGrade => (CONDITION_GRADES as readonly string[]).includes(value))
  const sizes = list(get("size")).filter((value) => /^\d{2}(\.5)?$/.test(value))
  const brands = list(get("brand")).filter((value) => /^[a-z0-9-]{1,40}$/.test(value))
  const q = first("q")?.slice(0, 80)
  const kind = first("kind")
  return {
    kind: kind === "new" || kind === "preloved" ? kind : undefined,
    gender: genders.length ? genders : undefined,
    sizes: sizes.length ? sizes : undefined,
    brands: brands.length ? brands : undefined,
    priceMin: min.success && first("min") ? min.data * 100 : undefined,
    priceMax: max.success && first("max") ? max.data * 100 : undefined,
    condition: conditions.length ? conditions : undefined,
    sort,
    page: page.success ? page.data : 1,
    q: q || undefined,
  }
}
