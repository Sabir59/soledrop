import { changePasswordSchema } from "@/features/account/schemas/auth"
import { customerService } from "@/server/customers"
import { parseBody, requireCustomer, route, setSessionCookie } from "@/server/http/route"

/** Changing the password signs out every other device. */
export const POST = route(async (request) => {
  const customer = await requireCustomer()
  const { currentPassword, newPassword } = await parseBody(request, changePasswordSchema)
  const session = await customerService().changePassword(customer, currentPassword, newPassword)
  await setSessionCookie(session.token, session.expiresAt)
  return Response.json({ ok: true })
})
