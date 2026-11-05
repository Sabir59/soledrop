import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import type { PaymentProvider } from "@/server/adapters/payments/types"

/**
 * Stripe reference adapter (Checkout Sessions over the REST API, no SDK). Off unless
 * STRIPE_SECRET_KEY is set and the `stripe-payments` flag is on. Never runs in the browser.
 */
export function createStripeProvider(options: { secretKey?: string; webhookSecret?: string; enabled: () => Promise<boolean> }): PaymentProvider {
  const call = async (path: string, form: Record<string, string>, idempotencyKey: string) => {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
        "idempotency-key": idempotencyKey,
      },
      body: new URLSearchParams(form),
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await response.json()) as Record<string, unknown>
    if (!response.ok) throw new Error(`Stripe ${path} failed: ${(body.error as { message?: string } | undefined)?.message ?? response.status}`)
    return body
  }

  return {
    code: "stripe",
    label: "Card (Visa, Mastercard)",
    description: "Pay securely by card through Stripe.",
    async isAvailable() {
      return Boolean(options.secretKey) && (await options.enabled())
    },
    async createPayment(input) {
      const session = await call(
        "checkout/sessions",
        {
          mode: "payment",
          "line_items[0][price_data][currency]": input.currency.toLowerCase(),
          "line_items[0][price_data][product_data][name]": `Sole Drop order ${input.orderNumber}`,
          "line_items[0][price_data][unit_amount]": String(input.amount),
          "line_items[0][quantity]": "1",
          customer_email: input.email,
          client_reference_id: input.orderId,
          "metadata[order_id]": input.orderId,
          success_url: `${input.returnUrl}&paid=1`,
          cancel_url: input.returnUrl,
        },
        input.idempotencyKey,
      )
      return { status: "pending", providerRef: String(session.id), next: { type: "redirect", url: String(session.url) } }
    },
    async parseWebhook(rawBody, headers) {
      const header = headers.get("stripe-signature") ?? ""
      const parts = Object.fromEntries(header.split(",").map((part) => part.split("=") as [string, string]))
      const expected = createHmac("sha256", options.webhookSecret ?? "").update(`${parts.t}.${rawBody}`).digest("hex")
      const given = Buffer.from(parts.v1 ?? "", "hex")
      if (!options.webhookSecret || given.length !== 32 || !timingSafeEqual(given, Buffer.from(expected, "hex"))) throw new Error("Invalid Stripe signature")
      if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) throw new Error("Stale Stripe webhook")
      const event = JSON.parse(rawBody) as { type: string; data: { object: { id: string; amount_total: number; metadata: { order_id: string } } } }
      if (event.type === "checkout.session.completed") {
        return { orderId: event.data.object.metadata.order_id, providerRef: event.data.object.id, status: "captured", amount: event.data.object.amount_total }
      }
      if (event.type === "checkout.session.expired") {
        return { orderId: event.data.object.metadata.order_id, providerRef: event.data.object.id, status: "failed", amount: 0 }
      }
      return null
    },
    async refund(providerRef, amount, idempotencyKey) {
      const session = await fetch(`https://api.stripe.com/v1/checkout/sessions/${providerRef}`, { headers: { authorization: `Bearer ${options.secretKey}` } })
      const body = (await session.json()) as { payment_intent: string }
      const refund = await call("refunds", { payment_intent: body.payment_intent, amount: String(amount) }, idempotencyKey)
      return { providerRef: String(refund.id) }
    },
  }
}
