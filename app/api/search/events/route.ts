import { z } from "zod"

import { clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"
import { logSearchEvent, searchCount } from "@/server/storefront"

const schema = z.discriminatedUnion("kind", [
  /** A shopper opened a result from the overlay. */
  z.object({ kind: z.literal("click"), query: z.string().trim().min(1).max(100), slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }),
  /** The overlay settled on a query; the server counts its results itself. */
  z.object({ kind: z.literal("search"), query: z.string().trim().min(2).max(100) }),
])

/** Search analytics from the overlay (clicks and settled queries, including zero-result ones). */
export const POST = route(async (request) => {
  await enforceRateLimit("searchEvents", await clientKey())
  const event = await parseBody(request, schema)
  if (event.kind === "click") await logSearchEvent({ query: event.query, slug: event.slug, source: "overlay" })
  else await logSearchEvent({ query: event.query, resultCount: await searchCount(event.query), source: "overlay" })
  return new Response(null, { status: 204 })
})
