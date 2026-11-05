import type { ShippingQuote, ShippingZone, TaxRate } from "@/server/shipping/types"

/** Finds the zone for a destination: city allow-lists first, then whole-country zones. */
export function zoneFor(zones: ShippingZone[], country: string, city?: string): ShippingZone | null {
  const sorted = [...zones].sort((a, b) => a.position - b.position)
  const normalisedCity = city?.trim().toLowerCase()
  return (
    sorted.find((zone) => zone.countries.includes(country) && normalisedCity && zone.cities.includes(normalisedCity)) ??
    sorted.find((zone) => zone.countries.includes(country) && zone.cities.length === 0) ??
    null
  )
}

/** Quotes every rate in the zone for a discounted subtotal; `freeShipping` comes from promotions. */
export function quoteRates(zone: ShippingZone, discountedSubtotal: number, freeShipping: boolean, enabledCodes?: Set<string>): ShippingQuote[] {
  return zone.rates
    .filter((rate) => !enabledCodes || enabledCodes.has(rate.code))
    .map((rate) => {
      const free = freeShipping || (rate.freeOver !== null && discountedSubtotal >= rate.freeOver)
      return { ...rate, free, effectiveAmount: free ? 0 : rate.amount }
    })
}

/**
 * Tax on an amount. Inclusive rates extract the tax already inside the price
 * (amount × rate / (1 + rate)); exclusive rates add it on top.
 */
export function taxFor(amount: number, rate: TaxRate | null): { tax: number; inclusive: boolean } {
  if (!rate || amount <= 0) return { tax: 0, inclusive: rate?.inclusive ?? true }
  if (rate.inclusive) return { tax: Math.round((amount * rate.basisPoints) / (10000 + rate.basisPoints)), inclusive: true }
  return { tax: Math.round((amount * rate.basisPoints) / 10000), inclusive: false }
}

export function taxRateFor(rates: TaxRate[], country: string, province?: string): TaxRate | null {
  return rates.find((rate) => rate.country === country && rate.province === (province ?? null)) ?? rates.find((rate) => rate.country === country && rate.province === null) ?? null
}
