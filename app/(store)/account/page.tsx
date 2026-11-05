import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AccountDashboard } from "@/features/account/components/account-dashboard"
import { customerService, toProfile } from "@/server/customers"
import { currentStoreId } from "@/server/db/driver"
import { toOrderDto } from "@/server/http/dto"
import { currentCustomer } from "@/server/http/route"
import { orderService } from "@/server/orders"

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } }

/** Account (derived): orders, details, addresses, password and privacy. Guests are sent to sign in. */
export default async function AccountPage() {
  const customer = await currentCustomer()
  if (!customer) redirect("/account/login?next=/account")
  const [orders, addresses] = await Promise.all([orderService().listForCustomer(currentStoreId(), customer.id), customerService().listAddresses(customer.id)])
  return <AccountDashboard customer={toProfile(customer)} orders={orders.map((order) => toOrderDto(order))} addresses={addresses} />
}
