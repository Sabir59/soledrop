import "server-only"

import { selectRepository } from "@/server/db/driver"
import { createFixturesPromotionRepository } from "@/server/promotions/fixtures.repository"
import { createSupabasePromotionRepository } from "@/server/promotions/supabase.repository"

export const promotionsRepository = selectRepository({ fixtures: createFixturesPromotionRepository, supabase: createSupabasePromotionRepository })
export { evaluatePromotions, ineligibility } from "@/server/promotions/evaluate"
export type { Promotion, PromotionAction, PromotionCondition } from "@/server/promotions/types"
