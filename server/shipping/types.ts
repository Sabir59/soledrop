export type ShippingRate = {
  code: string
  label: string
  amount: number
  /** Subtotal (after discounts) at which this rate becomes free; null = never. */
  freeOver: number | null
  minDays: number
  maxDays: number
  cashOnDelivery: boolean
}

export type ShippingZone = {
  id: string
  name: string
  countries: string[]
  /** Optional city allow-list (lower-case); empty = whole country. */
  cities: string[]
  rates: ShippingRate[]
  position: number
}

export type TaxRate = {
  country: string
  province: string | null
  label: string
  basisPoints: number
  /** Pakistani retail prices are shown tax-inclusive; the tax figure is extracted for the invoice. */
  inclusive: boolean
}

export type ShippingQuote = ShippingRate & { free: boolean; effectiveAmount: number }
