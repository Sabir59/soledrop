import { z } from "zod"

import { currentStoreId } from "@/server/db/driver"
import { apiV1 } from "@/server/http/api-v1"
import { toOrderDto } from "@/server/http/dto"
import { parseBody } from "@/server/http/route"
import { orderService } from "@/server/orders"
import { ORDER_STATUSES } from "@/server/orders/types"
import { DomainError } from "@/server/shared/errors"

type Context = { params: Promise<{ number: string }> }

const schema = z.object({
  to: z.enum(ORDER_STATUSES),
  note: z.string().max(500).optional(),
  trackingNumber: z.string().max(80).optional(),
})

/** Moves an order along the state machine (e.g. a courier integration marking it shipped). */
export const POST = apiV1<Context>("write", async (request, client, { params }) => {
  const { number } = await params
  const input = await parseBody(request, schema)
  const service = orderService()
  const order = await service.lookupByNumber(currentStoreId(), number)
  if (!order) throw new DomainError("not_found", "Order not found.")
  const updated = await service.transition(order.id, input.to, `api:${client.name}`, input.note, input.trackingNumber)
  return Response.json({ order: toOrderDto(updated) })
})
