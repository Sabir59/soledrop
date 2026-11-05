import type { CurrencyCode } from "@/server/shared/money"

/**
 * A price list applies to shoppers matching `customerGroup` (null = everyone) between its
 * dates; the highest `priority` list that prices a variant wins (server/pricing/service.ts).
 */
export type PriceList = {
  id: string
  code: string
  currency: CurrencyCode
  customerGroup: string | null
  priority: number
  startsAt: string | null
  endsAt: string | null
}

export type PriceRow = { priceListId: string; variantId: string; amount: number; compareAt: number | null }

/** Display-only conversion rates from the base currency; checkout always charges in PKR. */
export type ExchangeRates = { base: CurrencyCode; rates: Partial<Record<CurrencyCode, number>>; updatedAt: string }
