import { savedAddressSchema } from "@/features/account/schemas/auth"
import { customerService } from "@/server/customers"
import { parseBody, requireCustomer, route } from "@/server/http/route"

type Context = { params: Promise<{ id: string }> }

export const PUT = route<Context>(async (request, { params }) => {
  const customer = await requireCustomer()
  const { id } = await params
  const input = await parseBody(request, savedAddressSchema)
  return Response.json({ address: await customerService().saveAddress(customer.id, { ...input, id }) })
})

export const DELETE = route<Context>(async (_request, { params }) => {
  const customer = await requireCustomer()
  const { id } = await params
  await customerService().deleteAddress(customer.id, id)
  return new Response(null, { status: 204 })
})
