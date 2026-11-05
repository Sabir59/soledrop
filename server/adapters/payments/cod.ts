import "server-only"

import type { PaymentProvider } from "@/server/adapters/payments/types"

/** Cash on delivery: nothing to collect online; the rider collects and staff record the payment. */
export function createCashOnDeliveryProvider(): PaymentProvider {
  return {
    code: "cod",
    label: "Cash on delivery",
    description: "Pay in cash when your order arrives.",
    async isAvailable() {
      return true
    },
    async createPayment() {
      return { status: "pending", providerRef: null, next: { type: "none" } }
    },
  }
}
