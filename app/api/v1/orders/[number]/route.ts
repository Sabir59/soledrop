import { currentStoreId } from "@/server/db/driver"
import { apiV1 } from "@/server/http/api-v1"
import { toOrderDto } from "@/server/http/dto"
import { orderService } from "@/server/orders"
import { DomainError } from "@/server/shared/errors"

type Context = { params: Promise<{ number: string }> }

export const GET = apiV1<Context>("read", async (_request, _client, { params }) => {
  const { number } = await params
  const service = orderService()
  const order = await service.lookupByNumber(currentStoreId(), number)
  if (!order) throw new DomainError("not_found", "Order not found.")
  const [payments, returns] = await Promise.all([service.listPayments(order.id), service.listReturns(order.id)])
  return Response.json({ order: toOrderDto(order, returns), payments })
})
