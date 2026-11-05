/** ISO 4217 codes the store can price in. PKR is the base currency. */
export const CURRENCIES = ["PKR", "USD", "AED", "GBP"] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

/** Minor units per major unit. All money is stored and computed as integers in minor units. */
const MINOR_UNITS: Record<CurrencyCode, number> = { PKR: 100, USD: 100, AED: 100, GBP: 100 }

export type Money = { amount: number; currency: CurrencyCode }

/**
 * Builds a Money value from minor units, refusing fractions so float drift can't enter totals.
 * @throws if `amount` isn't a safe integer.
 */
export function money(amount: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(amount)) throw new Error(`Money must be an integer in minor units, got ${amount}`)
  return { amount, currency }
}

/** Converts whole major units (e.g. 28999 rupees) to minor units. */
export function fromMajor(major: number, currency: CurrencyCode): number {
  return Math.round(major * MINOR_UNITS[currency])
}

/** Sums amounts of one currency. */
export function sum(values: Money[], currency: CurrencyCode): Money {
  return money(
    values.reduce((total, value) => {
      if (value.currency !== currency) throw new Error(`Currency mismatch: ${value.currency} vs ${currency}`)
      return total + value.amount
    }, 0),
    currency,
  )
}

/** Multiplies by an integer quantity. */
export function times(value: Money, quantity: number): Money {
  return money(value.amount * quantity, value.currency)
}

/**
 * Percentage of an amount, rounded half-up to the minor unit (basis points avoid float percentages).
 * @param basisPoints 10000 = 100 %.
 */
export function percentOf(value: Money, basisPoints: number): Money {
  return money(Math.round((value.amount * basisPoints) / 10000), value.currency)
}

/**
 * Splits `total` across weights so the parts add up exactly (largest remainder method). Used to
 * allocate an order-level discount across lines for refunds and tax.
 */
export function allocate(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (weightSum === 0) return weights.map(() => 0)
  const raw = weights.map((weight) => (total * weight) / weightSum)
  const floored = raw.map(Math.floor)
  let remainder = total - floored.reduce((a, b) => a + b, 0)
  const order = raw.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction)
  for (const { index } of order) {
    if (remainder <= 0) break
    floored[index] += 1
    remainder -= 1
  }
  return floored
}

/** Whole-percent discount between a compare-at and a selling price, rounded down ("17% OFF"). */
export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.floor(((compareAt - price) / compareAt) * 100 + 1e-9)
}

/** Minor → major for display. */
export function toMajor(value: Money): number {
  return value.amount / MINOR_UNITS[value.currency]
}
