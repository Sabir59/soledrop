import { cartService } from "@/server/cart"
import { loadCart, pricedCartResponse } from "@/server/http/cart"
import { route } from "@/server/http/route"
import { DomainError } from "@/server/shared/errors"

type Context = { params: Promise<{ code: string }> }

export const DELETE = route<Context>(async (_request, { params }) => {
  const { code } = await params
  const { row, shopper } = await loadCart({ create: false })
  if (!row) throw new DomainError("not_found", "Your bag is empty.")
  return pricedCartResponse(await cartService().removeCode(row, decodeURIComponent(code)), shopper)
})
