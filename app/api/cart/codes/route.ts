import { promoCodeSchema } from "@/features/cart/schemas/cart"
import { cartService } from "@/server/cart"
import { loadCart, pricedCartResponse } from "@/server/http/cart"
import { clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"
import { DomainError } from "@/server/shared/errors"

/** Apply a promo code; an ineligible code is refused with the reason (never silently ignored). */
export const POST = route(async (request) => {
  await enforceRateLimit("lookup", await clientKey())
  const { code } = await parseBody(request, promoCodeSchema)
  const { row, shopper } = await loadCart({ create: false })
  if (!row) throw new DomainError("promotion_invalid", "Add something to your bag first.")
  return pricedCartResponse(await cartService().applyCode(row, code, shopper), shopper)
})
