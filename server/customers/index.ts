import "server-only"

import { createFixturesCustomerRepository } from "@/server/customers/fixtures.repository"
import { createCustomerService } from "@/server/customers/service"
import { createSupabaseCustomerRepository } from "@/server/customers/supabase.repository"
import { selectRepository } from "@/server/db/driver"
import { orderService } from "@/server/orders"
import { publish } from "@/server/platform/events"

const repository = selectRepository({ fixtures: createFixturesCustomerRepository, supabase: createSupabaseCustomerRepository })

export const customerService = () => {
  const orders = orderService()
  return createCustomerService({ customers: repository(), publish, orders: { listForCustomer: orders.listForCustomer, anonymiseCustomer: orders.anonymiseCustomer } })
}

export { SESSION_DAYS, toProfile } from "@/server/customers/service"
export type * from "@/server/customers/types"
