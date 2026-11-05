import "server-only"

import { db } from "@/server/fixtures/store"
import type { ShippingRepository } from "@/server/shipping/repository"

export function createFixturesShippingRepository(): ShippingRepository {
  return {
    async listZones() {
      return db().shippingZones
    },
    async listTaxRates() {
      return db().taxRates
    },
  }
}
