import { z } from "zod"

import { emailSchema } from "@/features/checkout/schemas/checkout"
import { newsletterSchema } from "@/features/content/schemas/forms"
import { contentService } from "@/server/content"
import { currentStoreId } from "@/server/db/driver"
import { clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"

export const POST = route(async (request) => {
  await enforceRateLimit("newsletter", await clientKey())
  const { website, email, source } = await parseBody(request, newsletterSchema)
  if (website) return Response.json({ ok: true, created: true }, { status: 202 })
  const { created } = await contentService().subscribe(currentStoreId(), email, source)
  return Response.json({ ok: true, created }, { status: 202 })
})

/** One-click unsubscribe from the signed link in every newsletter email. */
export const DELETE = route(async (request) => {
  const { email, token } = await parseBody(request, z.object({ email: emailSchema, token: z.string().min(10).max(200) }))
  const done = await contentService().unsubscribe(currentStoreId(), email, token)
  return Response.json({ ok: done }, { status: done ? 200 : 422 })
})
