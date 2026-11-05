import { customerService } from "@/server/customers"
import { requireCustomer, route } from "@/server/http/route"

/** Right of access: a JSON download of everything we hold about the customer. */
export const GET = route(async () => {
  const customer = await requireCustomer()
  const data = await customerService().exportData(customer)
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="sole-drop-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
})
