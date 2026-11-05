import { parseProductQuery } from "@/features/catalog/schemas/query"
import { catalog } from "@/server/catalog"
import { currentStoreId } from "@/server/db/driver"
import { apiV1 } from "@/server/http/api-v1"

/** GET /api/v1/products — same filters as the storefront listing URLs, plus `collection` and `kind`. */
export const GET = apiV1("read", async (request) => {
  const params = new URL(request.url).searchParams
  const query = parseProductQuery(params)
  const kind = params.get("kind")
  const page = await catalog().queryProducts(
    {
      ...query,
      collection: params.get("collection") ?? undefined,
      kind: kind === "new" || kind === "preloved" ? kind : undefined,
      pageSize: Math.min(Number(params.get("pageSize")) || 24, 100),
    },
    { storeId: currentStoreId(), customerGroup: params.get("customerGroup") },
  )
  return Response.json(page)
})
