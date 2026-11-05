import type { ProductKind } from "@/server/catalog/types"

/** A condition the rules engine evaluates against a cart (server/rules). All must hold. */
export type PromotionCondition =
  | { type: "subtotal_at_least"; amount: number }
  | { type: "min_quantity"; quantity: number }
  | { type: "product_kind"; kind: ProductKind }
  | { type: "collection"; slugs: string[] }
  | { type: "customer_group"; groups: string[] }
  | { type: "first_order" }

export type PromotionAction =
  | { type: "percent_off_order"; basisPoints: number }
  | { type: "fixed_off_order"; amount: number }
  | { type: "percent_off_items"; basisPoints: number; kind?: ProductKind; collections?: string[] }
  | { type: "free_shipping" }

export type Promotion = {
  id: string
  storeId: string
  /** Null for automatic promotions. Codes are stored upper-case. */
  code: string | null
  title: string
  conditions: PromotionCondition[]
  actions: PromotionAction[]
  startsAt: string | null
  endsAt: string | null
  usageLimit: number | null
  perCustomerLimit: number | null
  timesUsed: number
  active: boolean
  combinable: boolean
}

export type PromotionRedemption = { promotionId: string; orderId: string; email: string; at: string }
