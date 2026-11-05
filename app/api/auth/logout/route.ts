import { cookies } from "next/headers"

import { customerService } from "@/server/customers"
import { clearCartCookie, clearSessionCookie, route, SESSION_COOKIE } from "@/server/http/route"

export const POST = route(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (token) await customerService().logout(token)
  await clearSessionCookie()
  // The bag stays with the account; a fresh guest bag starts on this device.
  await clearCartCookie()
  return new Response(null, { status: 204 })
})
