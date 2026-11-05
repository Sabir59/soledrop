import "server-only"

import { serverEnv } from "@/lib/env.server"
import { availablePaymentProviders, paymentProvider } from "@/server/adapters/payments"
import { cartService } from "@/server/cart"
import { catalog } from "@/server/catalog"
import { selectRepository } from "@/server/db/driver"
import { createFixturesOrderRepository } from "@/server/orders/fixtures.repository"
import { createOrderService } from "@/server/orders/service"
import { createSupabaseOrderRepository } from "@/server/orders/supabase.repository"

const repository = selectRepository({ fixtures: createFixturesOrderRepository, supabase: createSupabaseOrderRepository })

export const orderService = () =>
  createOrderService({
    orders: repository(),
    carts: cartService(),
    catalog: catalog(),
    payments: { get: paymentProvider, available: availablePaymentProviders },
    secret: serverEnv.SESSION_SECRET,
  })

export { ORDER_STATUS_LABEL, ORDER_TRANSITIONS, customerCanCancel, customerCanRequestReturn } from "@/server/orders/state-machine"
export type { CheckoutInput, CheckoutResult, OrderViewer } from "@/server/orders/service"
export type * from "@/server/orders/types"
