import { loginSchema } from "@/features/account/schemas/auth"
import { customerService } from "@/server/customers"
import { currentStoreId } from "@/server/db/driver"
import { completeSignIn } from "@/server/http/auth"
import { clientKey, parseBody, route } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"

export const POST = route(async (request) => {
  const input = await parseBody(request, loginSchema)
  // Limited per address and per account, so one IP can't spray many accounts and one account can't be brute-forced from many IPs.
  await enforceRateLimit("auth", await clientKey())
  await enforceRateLimit("auth", `email:${input.email}`)
  const { customer, session } = await customerService().login(currentStoreId(), input.email, input.password)
  await completeSignIn(customer.id, session)
  return Response.json({ customer })
})
