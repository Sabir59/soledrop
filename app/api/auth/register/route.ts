import { registerSchema } from "@/features/account/schemas/auth"
import { contentService } from "@/server/content"
import { customerService } from "@/server/customers"
import { currentStoreId } from "@/server/db/driver"
import { completeSignIn } from "@/server/http/auth"
import { clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"

export const POST = route(async (request) => {
  await enforceRateLimit("auth", await clientKey())
  const input = await parseBody(request, registerSchema)
  const storeId = currentStoreId()
  const { customer, session } = await customerService().register(storeId, input)
  await completeSignIn(customer.id, session)
  if (input.marketingOptIn) await contentService().subscribe(storeId, customer.email, "register")
  return Response.json({ customer }, { status: 201 })
})
