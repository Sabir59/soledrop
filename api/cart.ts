// SWAP → none: talks to the real BFF (`app/api/cart/*`) on both data drivers.
import { request } from "@/api/http"
import type { Cart } from "@/server/cart/types"
import type { ShippingQuote } from "@/server/shipping/types"

export type CartResponse = { cart: Cart; shippingQuotes: ShippingQuote[] }

export const cartApi = {
  get: (signal?: AbortSignal) => request<CartResponse>("/api/cart", { signal }),
  add: (variantId: string, quantity = 1) => request<CartResponse>("/api/cart", { method: "POST", body: { variantId, quantity } }),
  update: (lineId: string, quantity: number) => request<CartResponse>(`/api/cart/lines/${lineId}`, { method: "PATCH", body: { quantity } }),
  remove: (lineId: string) => request<CartResponse>(`/api/cart/lines/${lineId}`, { method: "DELETE" }),
  applyCode: (code: string) => request<CartResponse>("/api/cart/codes", { method: "POST", body: { code } }),
  removeCode: (code: string) => request<CartResponse>(`/api/cart/codes/${encodeURIComponent(code)}`, { method: "DELETE" }),
}
