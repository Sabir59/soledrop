import "server-only"

import { supabase, unwrap } from "@/server/db/supabase"
import type { PromotionRepository } from "@/server/promotions/repository"
import type { Promotion } from "@/server/promotions/types"

type PromotionRecord = {
  id: string
  store_id: string
  code: string | null
  title: string
  conditions: Promotion["conditions"]
  actions: Promotion["actions"]
  starts_at: string | null
  ends_at: string | null
  usage_limit: number | null
  per_customer_limit: number | null
  times_used: number
  active: boolean
  combinable: boolean
}

export function createSupabasePromotionRepository(): PromotionRepository {
  return {
    async listActive(storeId) {
      const rows = unwrap(await supabase().from("promotions").select("*").eq("store_id", storeId).eq("active", true)) as PromotionRecord[]
      return rows.map((row) => ({
        id: row.id,
        storeId: row.store_id,
        code: row.code,
        title: row.title,
        conditions: row.conditions,
        actions: row.actions,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        usageLimit: row.usage_limit,
        perCustomerLimit: row.per_customer_limit,
        timesUsed: row.times_used,
        active: row.active,
        combinable: row.combinable,
      }))
    },
    async redemptionsFor(storeId, shopper) {
      const rows = unwrap(
        await supabase().rpc("promotion_redemption_counts", { p_store_id: storeId, p_customer_id: shopper.customerId, p_email: shopper.email }),
      ) as { promotion_id: string; redemptions: number }[]
      return new Map(rows.map((row) => [row.promotion_id, row.redemptions]))
    },
    async orderCountFor(storeId, shopper) {
      return unwrap(
        await supabase().rpc("shopper_order_count", { p_store_id: storeId, p_customer_id: shopper.customerId, p_email: shopper.email }),
      ) as number
    },
  }
}
