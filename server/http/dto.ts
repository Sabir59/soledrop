import "server-only"

import { customerCanCancel, customerCanRequestReturn, ORDER_STATUS_LABEL } from "@/server/orders/state-machine"
import type { Order, ReturnRequest } from "@/server/orders/types"

/** What a shopper may see of an order: never the token hash or idempotency key. */
export function toOrderDto(order: Order, returns: ReturnRequest[] = []) {
  const { accessTokenHash: _hash, idempotencyKey: _key, ...visible } = order
  const deliveredAt = order.history.findLast((entry) => entry.to === "delivered")?.at ?? null
  return {
    ...visible,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    canCancel: customerCanCancel(order.status),
    canRequestReturn: customerCanRequestReturn(order.status, deliveredAt) && !returns.some((item) => item.status !== "rejected"),
    returns,
  }
}

export type OrderDto = ReturnType<typeof toOrderDto>
