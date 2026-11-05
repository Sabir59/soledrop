import { updateLineSchema } from "@/features/cart/schemas/cart"
import { cartService } from "@/server/cart"
import { loadCart, pricedCartResponse } from "@/server/http/cart"
import { clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"
import { DomainError } from "@/server/shared/errors"

type Context = { params: Promise<{ lineId: string }> }

async function requireCart() {
  const loaded = await loadCart({ create: false })
  if (!loaded.row) throw new DomainError("not_found", "Your bag is empty.")
  return { row: loaded.row, shopper: loaded.shopper }
}

export const PATCH = route<Context>(async (request, { params }) => {
  await enforceRateLimit("cart", await clientKey())
  const { lineId } = await params
  const { quantity } = await parseBody(request, updateLineSchema)
  const { row, shopper } = await requireCart()
  return pricedCartResponse(await cartService().updateLine(row, lineId, quantity, shopper), shopper)
})

export const DELETE = route<Context>(async (_request, { params }) => {
  await enforceRateLimit("cart", await clientKey())
  const { lineId } = await params
  const { row, shopper } = await requireCart()
  return pricedCartResponse(await cartService().removeLine(row, lineId), shopper)
})
