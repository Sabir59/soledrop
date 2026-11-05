import type { ShippingZone, TaxRate } from "@/server/shipping/types"

export interface ShippingRepository {
  listZones(storeId: string): Promise<ShippingZone[]>
  listTaxRates(storeId: string): Promise<TaxRate[]>
}
