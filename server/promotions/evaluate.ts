import type { ProductKind } from "@/server/catalog/types"
import type { Promotion, PromotionCondition } from "@/server/promotions/types"
import { allocate } from "@/server/shared/money"

/** What the engine needs to know about a cart line. */
export type PricedLine = { lineId: string; kind: ProductKind; collections: string[]; quantity: number; lineTotal: number }

export type PromotionContext = {
  lines: PricedLine[]
  subtotal: number
  customerGroup: string | null
  /** Orders already placed with this email/customer — powers `first_order`. */
  previousOrders: number
  /** Redemptions of each promotion by this shopper — powers per-customer limits. */
  redemptionsByPromotion: Map<string, number>
  at: Date
}

export type PromotionResult = {
  promotion: Promotion
  amount: number
  freeShipping: boolean
  /** Discount per line id; sums exactly to `amount`. */
  perLine: Map<string, number>
}

export type Rejection = { code: string; reason: string }

function conditionHolds(condition: PromotionCondition, context: PromotionContext): boolean {
  switch (condition.type) {
    case "subtotal_at_least":
      return context.subtotal >= condition.amount
    case "min_quantity":
      return context.lines.reduce((total, line) => total + line.quantity, 0) >= condition.quantity
    case "product_kind":
      return context.lines.some((line) => line.kind === condition.kind)
    case "collection":
      return context.lines.some((line) => line.collections.some((slug) => condition.slugs.includes(slug)))
    case "customer_group":
      return context.customerGroup !== null && condition.groups.includes(context.customerGroup)
    case "first_order":
      return context.previousOrders === 0
  }
}

/** Why a promotion can't apply right now, or null when it can. Messages are shown to shoppers. */
export function ineligibility(promotion: Promotion, context: PromotionContext): string | null {
  const at = context.at.getTime()
  if (!promotion.active) return "This code is no longer active."
  if (promotion.startsAt && Date.parse(promotion.startsAt) > at) return "This code isn't active yet."
  if (promotion.endsAt && Date.parse(promotion.endsAt) <= at) return "This code has expired."
  if (promotion.usageLimit !== null && promotion.timesUsed >= promotion.usageLimit) return "This code has been fully redeemed."
  if (promotion.perCustomerLimit !== null && (context.redemptionsByPromotion.get(promotion.id) ?? 0) >= promotion.perCustomerLimit) {
    return "You've already used this code."
  }
  for (const condition of promotion.conditions) {
    if (!conditionHolds(condition, context)) {
      switch (condition.type) {
        case "subtotal_at_least":
          return `Spend Rs. ${(condition.amount / 100).toLocaleString("en-PK")} or more to use this code.`
        case "first_order":
          return "This code is for first orders only."
        case "product_kind":
          return condition.kind === "preloved" ? "This code applies to pre-loved pairs only." : "This code applies to brand-new pairs only."
        default:
          return "Your bag doesn't qualify for this code."
      }
    }
  }
  return null
}

/** Applies one promotion's actions. Item-level discounts never exceed the line totals. */
function applyActions(promotion: Promotion, context: PromotionContext, alreadyDiscounted: Map<string, number>): PromotionResult {
  const perLine = new Map<string, number>()
  let freeShipping = false
  const remaining = (line: PricedLine) => line.lineTotal - (alreadyDiscounted.get(line.lineId) ?? 0) - (perLine.get(line.lineId) ?? 0)

  for (const action of promotion.actions) {
    if (action.type === "free_shipping") {
      freeShipping = true
      continue
    }
    const targets =
      action.type === "percent_off_items"
        ? context.lines.filter((line) => (!action.kind || line.kind === action.kind) && (!action.collections || line.collections.some((slug) => action.collections!.includes(slug))))
        : context.lines
    const base = targets.reduce((total, line) => total + remaining(line), 0)
    let amount = 0
    if (action.type === "fixed_off_order") amount = Math.min(action.amount, base)
    // Percentages round down to a whole rupee (100 minor units): shelf prices are whole rupees, so totals stay whole too.
    else amount = Math.min(base, Math.floor((base * action.basisPoints) / 10000 / 100) * 100)
    const shares = allocate(amount, targets.map(remaining))
    targets.forEach((line, index) => perLine.set(line.lineId, (perLine.get(line.lineId) ?? 0) + shares[index]))
  }
  const amount = [...perLine.values()].reduce((a, b) => a + b, 0)
  return { promotion, amount, freeShipping, perLine }
}

/**
 * Evaluates automatic promotions plus the shopper's codes. Non-combinable promotions stand
 * alone: when one is present, the single best non-combinable result wins over the combined set.
 */
export function evaluatePromotions(
  available: Promotion[],
  codes: string[],
  context: PromotionContext,
): { applied: PromotionResult[]; rejected: Rejection[] } {
  const rejected: Rejection[] = []
  const candidates: Promotion[] = available.filter((promotion) => promotion.code === null && ineligibility(promotion, context) === null)
  for (const code of codes) {
    const promotion = available.find((item) => item.code === code.toUpperCase())
    if (!promotion) {
      rejected.push({ code, reason: "We don't recognise this code." })
      continue
    }
    const reason = ineligibility(promotion, context)
    if (reason) rejected.push({ code, reason })
    else candidates.push(promotion)
  }

  const runAll = (promotions: Promotion[]) => {
    const discounted = new Map<string, number>()
    const results: PromotionResult[] = []
    for (const promotion of promotions) {
      const result = applyActions(promotion, context, discounted)
      for (const [lineId, value] of result.perLine) discounted.set(lineId, (discounted.get(lineId) ?? 0) + value)
      results.push(result)
    }
    return results
  }
  const total = (results: PromotionResult[]) => results.reduce((sum, result) => sum + result.amount, 0)

  const combinable = candidates.filter((promotion) => promotion.combinable)
  const exclusive = candidates.filter((promotion) => !promotion.combinable)
  let best = runAll(combinable)
  for (const promotion of exclusive) {
    const alone = runAll([promotion])
    if (total(alone) > total(best) || (total(alone) === total(best) && alone[0].freeShipping)) best = alone
  }
  for (const promotion of exclusive) {
    if (!best.some((result) => result.promotion.id === promotion.id) && promotion.code) {
      rejected.push({ code: promotion.code, reason: "This code can't be combined with your other discount." })
    }
  }
  return { applied: best, rejected }
}
