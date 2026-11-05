// SWAP → none: talks to the real BFF (`app/api/checkout/*`, `app/api/orders/*`).
import { request } from "@/api/http"
import type { CheckoutInput } from "@/features/checkout/schemas/checkout"
import type { PaymentNextStep } from "@/server/adapters/payments/types"
import type { Cart } from "@/server/cart/types"
import type { OrderDto } from "@/server/http/dto"
import type { ShippingQuote } from "@/server/shipping/types"

export type PaymentMethodOption = { code: string; label: string; description: string }
export type QuoteResponse = { cart: Cart; shippingQuotes: ShippingQuote[]; paymentMethods: PaymentMethodOption[]; holdExpiresAt: string | null }
export type PlaceOrderResponse = { order: { number: string; status: string; total: number; currency: string }; accessToken: string; next: PaymentNextStep; replayed: boolean }
export type OrderResponse = { order: OrderDto; next: PaymentNextStep }

const withToken = (path: string, token: string | null) => (token ? `${path}?token=${encodeURIComponent(token)}` : path)

export const checkoutApi = {
  quote: (input: { city?: string; province?: string; shippingCode?: string }) => request<QuoteResponse>("/api/checkout/quote", { method: "POST", body: input }),
  place: (input: CheckoutInput, idempotencyKey: string) =>
    request<PlaceOrderResponse>("/api/checkout", { method: "POST", body: input, headers: { "idempotency-key": idempotencyKey } }),
}

export const ordersApi = {
  get: (number: string, token: string | null) => request<OrderResponse>(withToken(`/api/orders/${number}`, token)),
  cancel: (number: string, token: string | null) => request<{ order: OrderDto }>(withToken(`/api/orders/${number}/cancel`, token), { method: "POST" }),
  requestReturn: (number: string, token: string | null, input: { lines: { orderLineId: string; quantity: number }[]; reason: string }) =>
    request<{ order: OrderDto }>(withToken(`/api/orders/${number}/returns`, token), { method: "POST", body: input }),
  lookup: (number: string, email: string) => request<{ number: string; token: string }>("/api/orders/lookup", { method: "POST", body: { number, email } }),
}
