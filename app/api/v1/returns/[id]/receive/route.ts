import { apiV1 } from "@/server/http/api-v1"
import { orderService } from "@/server/orders"

type Context = { params: Promise<{ id: string }> }

/** The warehouse received a return: its units go back into stock (restock_return). */
export const POST = apiV1<Context>("write", async (_request, client, { params }) => {
  const { id } = await params
  return Response.json({ return: await orderService().restockReturn(id, `api:${client.name}`) })
})
