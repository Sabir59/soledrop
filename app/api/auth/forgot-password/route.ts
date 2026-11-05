import { forgotPasswordSchema } from "@/features/account/schemas/auth"
import { customerService } from "@/server/customers"
import { currentStoreId } from "@/server/db/driver"
import { clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"

/** Always answers 202 so the form can't be used to find out who has an account. */
export const POST = route(async (request) => {
  await enforceRateLimit("auth", await clientKey())
  const { email } = await parseBody(request, forgotPasswordSchema)
  await customerService().requestPasswordReset(currentStoreId(), email)
  return Response.json({ ok: true }, { status: 202 })
})
