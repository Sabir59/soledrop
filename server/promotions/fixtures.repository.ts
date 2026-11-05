import "server-only"

import { db } from "@/server/fixtures/store"
import type { PromotionRepository } from "@/server/promotions/repository"

const matchesShopper = (order: { customerId: string | null; email: string }, shopper: { customerId: string | null; email: string | null }) =>
  (shopper.customerId !== null && order.customerId === shopper.customerId) ||
  (shopper.email !== null && order.email.toLowerCase() === shopper.email.toLowerCase())

export function createFixturesPromotionRepository(): PromotionRepository {
  return {
    async listActive(storeId) {
      return structuredClone(db().promotions.filter((promotion) => promotion.storeId === storeId && promotion.active))
    },
    async redemptionsFor(storeId, shopper) {
      const tables = db()
      const counts = new Map<string, number>()
      for (const redemption of tables.promotionRedemptions) {
        const order = tables.orders.find((row) => row.id === redemption.orderId && row.storeId === storeId)
        if (order && matchesShopper(order, shopper)) counts.set(redemption.promotionId, (counts.get(redemption.promotionId) ?? 0) + 1)
      }
      return counts
    },
    async orderCountFor(storeId, shopper) {
      return db().orders.filter((order) => order.storeId === storeId && order.status !== "cancelled" && matchesShopper(order, shopper)).length
    },
  }
}
