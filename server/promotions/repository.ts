import type { Promotion } from "@/server/promotions/types"

export interface PromotionRepository {
  listActive(storeId: string): Promise<Promotion[]>
  /** Redemption counts per promotion for a shopper (by customer id or, for guests, email). */
  redemptionsFor(storeId: string, shopper: { customerId: string | null; email: string | null }): Promise<Map<string, number>>
  /** Number of non-cancelled orders already placed by this shopper (first-order rules). */
  orderCountFor(storeId: string, shopper: { customerId: string | null; email: string | null }): Promise<number>
}
