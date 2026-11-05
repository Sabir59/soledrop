import { errorResponse } from "@/server/http/route"
import { orderService } from "@/server/orders"

type Context = { params: Promise<{ provider: string }> }

/**
 * Payment provider webhooks (e.g. /api/webhooks/stripe). The raw body is verified by the
 * provider adapter's signature check before anything is recorded; replays are idempotent.
 */
export async function POST(request: Request, { params }: Context) {
  const { provider } = await params
  try {
    const rawBody = await request.text()
    const payment = await orderService().applyWebhook(provider, rawBody, request.headers)
    return Response.json({ received: true, recorded: Boolean(payment) })
  } catch (error) {
    if (error instanceof Error && /signature|stale/i.test(error.message)) return Response.json({ error: { code: "unauthorized", message: error.message } }, { status: 400 })
    return errorResponse(error)
  }
}
