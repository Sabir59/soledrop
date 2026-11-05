import { returnRequestSchema } from "@/features/checkout/schemas/checkout"
import { currentStoreId } from "@/server/db/driver"
import { toOrderDto } from "@/server/http/dto"
import { currentCustomer, parseBody, route } from "@/server/http/route"
import { orderService } from "@/server/orders"
import { DomainError } from "@/server/shared/errors"

type Context = { params: Promise<{ number: string }> }

export const POST = route<Context>(async (request, { params }) => {
  const { number } = await params
  const token = new URL(request.url).searchParams.get("token")
  const input = await parseBody(request, returnRequestSchema)
  const customer = await currentCustomer()
  const viewer = { customerId: customer?.id ?? null, token }
  const service = orderService()
  const order = await service.findForViewer(currentStoreId(), number, viewer)
  if (!order) throw new DomainError("not_found", "We couldn't find that order.")
  await service.requestReturn(order, viewer, input.lines, input.reason)
  return Response.json({ order: toOrderDto(order, await service.listReturns(order.id)) }, { status: 201 })
})
