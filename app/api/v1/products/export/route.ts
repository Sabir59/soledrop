import { currentStoreId } from "@/server/db/driver"
import { apiV1 } from "@/server/http/api-v1"
import { productTransfer } from "@/server/import-export"

export const GET = apiV1("read", async () => {
  const csv = await productTransfer().exportCsv(currentStoreId())
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"` },
  })
})
