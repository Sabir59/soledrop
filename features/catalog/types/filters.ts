/** Options the listing filter sidebar offers. */
export type FilterOptions = {
  /** Pre-loved scopes only: grades present, with counts. */
  conditions?: { value: string; label: string; count: number }[]
  sizes: string[]
  brands: { value: string; label: string }[]
  /** Slider bounds in whole rupees. */
  price: { min: number; max: number }
}
