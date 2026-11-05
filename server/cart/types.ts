import type { ConditionGrade, ProductKind } from "@/server/catalog/types"
import type { CurrencyCode } from "@/server/shared/money"

export type CartLineRow = { id: string; variantId: string; quantity: number; addedAt: string }

export type CartRow = {
  id: string
  storeId: string
  /** SHA-256 of the cookie token; the raw token never touches storage. */
  tokenHash: string
  customerId: string | null
  currency: CurrencyCode
  lines: CartLineRow[]
  promotionCodes: string[]
  status: "active" | "converted" | "merged"
  createdAt: string
  updatedAt: string
}

/** A priced cart line as shown to the shopper. All amounts are minor units. */
export type CartLine = {
  id: string
  variantId: string
  productId: string
  slug: string
  title: string
  brand: string
  kind: ProductKind
  condition: ConditionGrade | null
  size: { eu: string; uk: string; us: string }
  colour: string | null
  image: { url: string; alt: string }
  quantity: number
  maxQuantity: number
  unitPrice: number
  compareAt: number | null
  lineTotal: number
  discount: number
  available: boolean
}

export type AppliedPromotion = { code: string | null; title: string; amount: number; freeShipping: boolean }

export type CartTotals = {
  subtotal: number
  discount: number
  shipping: number | null
  tax: number
  taxIncluded: boolean
  total: number
}

export type Cart = {
  id: string
  currency: CurrencyCode
  lines: CartLine[]
  itemCount: number
  promotions: AppliedPromotion[]
  rejectedCodes: { code: string; reason: string }[]
  totals: CartTotals
  freeShippingThreshold: number | null
  /** Problems the shopper must resolve before checkout (sold out, quantity reduced). */
  warnings: string[]
}
