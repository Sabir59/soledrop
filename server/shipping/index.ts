import "server-only"

import { selectRepository } from "@/server/db/driver"
import { createFixturesShippingRepository } from "@/server/shipping/fixtures.repository"
import { createSupabaseShippingRepository } from "@/server/shipping/supabase.repository"

export const shippingRepository = selectRepository({ fixtures: createFixturesShippingRepository, supabase: createSupabaseShippingRepository })
export { quoteRates, taxFor, taxRateFor, zoneFor } from "@/server/shipping/calculate"
export type { ShippingQuote, ShippingRate, ShippingZone, TaxRate } from "@/server/shipping/types"
