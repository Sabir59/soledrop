import { addLineSchema } from "@/features/cart/schemas/cart"
import { cartService } from "@/server/cart"
import { loadCart, pricedCartResponse } from "@/server/http/cart"
import { clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"

export const GET = route(async () => {
  const { row, shopper } = await loadCart({ create: false })
  return pricedCartResponse(row, shopper)
})

/** Add to bag. The server checks stock and the pre-loved one-pair rule; the client only sends ids. */
export const POST = route(async (request) => {
  await enforceRateLimit("cart", await clientKey())
  const input = await parseBody(request, addLineSchema)
  const { row, shopper } = await loadCart({ create: true })
  const updated = await cartService().addLine(row!, input.variantId, input.quantity, shopper)
  return pricedCartResponse(updated, shopper, undefined, { status: 201 })
})
