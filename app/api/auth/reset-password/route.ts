import { resetPasswordSchema } from "@/features/account/schemas/auth"
import { customerService } from "@/server/customers"
import { setSessionCookie, clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"

/** One-time link: sets the new password, signs out every other device and signs this one in. */
export const POST = route(async (request) => {
  await enforceRateLimit("auth", await clientKey())
  const { token, password } = await parseBody(request, resetPasswordSchema)
  const session = await customerService().resetPassword(token, password)
  await setSessionCookie(session.token, session.expiresAt)
  return Response.json({ ok: true })
})
