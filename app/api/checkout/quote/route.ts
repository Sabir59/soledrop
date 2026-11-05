import { quoteSchema } from "@/features/checkout/schemas/checkout"
import { serverEnv } from "@/lib/env.server"
import { availablePaymentProviders } from "@/server/adapters/payments"
import { cartService } from "@/server/cart"
import { EMPTY_CART, loadCart } from "@/server/http/cart"
import { parseBody, route } from "@/server/http/route"

/**
 * Checkout quote: holds the bag's stock for the reservation window and returns totals,
 * delivery options and payment methods for the address entered so far.
 */
export const POST = route(async (request) => {
  const input = await parseBody(request, quoteSchema)
  const { row, shopper } = await loadCart({ create: false })
  const providers = await availablePaymentProviders()
  const paymentMethods = providers.map((provider) => ({ code: provider.code, label: provider.label, description: provider.description }))
  if (!row || row.lines.length === 0) return Response.json({ cart: EMPTY_CART, shippingQuotes: [], paymentMethods, holdExpiresAt: null })

  const service = cartService()
  let holdExpiresAt: string | null = new Date(Date.now() + serverEnv.RESERVATION_TTL_MINUTES * 60_000).toISOString()
  try {
    await service.reserveForCheckout(row, serverEnv.RESERVATION_TTL_MINUTES)
  } catch {
    // Something sold out meanwhile: pricing below reports exactly which line, so the shopper can fix it.
    holdExpiresAt = null
  }
  const priced = await service.price(row, shopper, { country: "PK", city: input.city, province: input.province, shippingCode: input.shippingCode })
  return Response.json({ cart: priced.cart, shippingQuotes: priced.shippingQuotes, paymentMethods, holdExpiresAt })
})
