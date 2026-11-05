import { catalog } from "@/server/catalog"
import { currentStoreId } from "@/server/db/driver"
import { apiV1 } from "@/server/http/api-v1"
import { DomainError } from "@/server/shared/errors"

type Context = { params: Promise<{ slug: string }> }

export const GET = apiV1<Context>("read", async (request, _client, { params }) => {
  const { slug } = await params
  const product = await catalog().getProduct(slug, { storeId: currentStoreId(), customerGroup: new URL(request.url).searchParams.get("customerGroup") })
  if (!product) throw new DomainError("not_found", "Product not found.")
  return Response.json({ product })
})
