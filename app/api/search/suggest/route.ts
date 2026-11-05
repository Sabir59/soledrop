import { clientKey, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"
import { searchSuggest } from "@/server/storefront"

/**
 * Search overlay data (docs/app/api.md): the landing panel for an empty query, else suggestions,
 * collections, brands and up to eight products as a trimmed DTO. Retail prices only, so the
 * response is the same for every shopper; it is still not cached publicly because it is rate-limited.
 */
export const GET = route(async (request) => {
  await enforceRateLimit("search", await clientKey())
  const q = new URL(request.url).searchParams.get("q") ?? ""
  return Response.json(await searchSuggest(q))
})
