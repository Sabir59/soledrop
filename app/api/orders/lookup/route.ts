import { orderLookupSchema } from "@/features/checkout/schemas/checkout"
import { currentStoreId } from "@/server/db/driver"
import { clientKey, parseBody, route } from "@/server/http/route"
import { orderService } from "@/server/orders"
import { enforceRateLimit } from "@/server/platform/guards"
import { DomainError } from "@/server/shared/errors"

/** Guest order tracking: number + checkout email returns the order's private link. Rate limited. */
export const POST = route(async (request) => {
  await enforceRateLimit("lookup", await clientKey())
  const { number, email } = await parseBody(request, orderLookupSchema)
  const service = orderService()
  const order = await service.lookup(currentStoreId(), number, email)
  if (!order) throw new DomainError("not_found", "No order matches that number and email.")
  return Response.json({ number: order.number, token: service.accessTokenFor(order.idempotencyKey) })
})
