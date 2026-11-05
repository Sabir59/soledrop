import { deleteAccountSchema, profileSchema } from "@/features/account/schemas/auth"
import { customerService, toProfile } from "@/server/customers"
import { currentStoreId } from "@/server/db/driver"
import { toOrderDto } from "@/server/http/dto"
import { clearCartCookie, clearSessionCookie, currentCustomer, parseBody, requireCustomer, route } from "@/server/http/route"
import { orderService } from "@/server/orders"
import { audit } from "@/server/platform/guards"

/** The signed-in customer with their orders; `{ customer: null }` for guests (not an error). */
export const GET = route(async () => {
  const customer = await currentCustomer()
  if (!customer) return Response.json({ customer: null, orders: [], addresses: [] })
  const [orders, addresses] = await Promise.all([orderService().listForCustomer(currentStoreId(), customer.id), customerService().listAddresses(customer.id)])
  return Response.json({ customer: toProfile(customer), orders: orders.map((order) => toOrderDto(order)), addresses })
})

export const PATCH = route(async (request) => {
  const customer = await requireCustomer()
  const input = await parseBody(request, profileSchema)
  return Response.json({ customer: await customerService().updateProfile(customer.id, input) })
})

/** Right to erasure. Orders are kept (anonymised) because tax law requires the amounts. */
export const DELETE = route(async (request) => {
  const customer = await requireCustomer()
  const { password } = await parseBody(request, deleteAccountSchema)
  await customerService().deleteAccount(customer, password)
  await audit(`customer:${customer.id}`, "customer.deleted", "customer", customer.id, null, null)
  await clearSessionCookie()
  await clearCartCookie()
  return new Response(null, { status: 204 })
})
