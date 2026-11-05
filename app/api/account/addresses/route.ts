import { savedAddressSchema } from "@/features/account/schemas/auth"
import { customerService } from "@/server/customers"
import { parseBody, requireCustomer, route } from "@/server/http/route"

export const GET = route(async () => {
  const customer = await requireCustomer()
  return Response.json({ addresses: await customerService().listAddresses(customer.id) })
})

export const POST = route(async (request) => {
  const customer = await requireCustomer()
  const input = await parseBody(request, savedAddressSchema)
  return Response.json({ address: await customerService().saveAddress(customer.id, input) }, { status: 201 })
})
