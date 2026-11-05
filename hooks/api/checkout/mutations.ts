"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { checkoutApi, ordersApi } from "@/api/checkout"
import type { CheckoutInput } from "@/features/checkout/schemas/checkout"
import { cartKeys } from "@/hooks/api/cart/queries"

/** Re-prices the bag for the address and delivery option entered so far (and holds its stock). */
export function useCheckoutQuote() {
  return useMutation({ mutationFn: checkoutApi.quote })
}

/** Places the order; the bag is converted on the server, so the cached bag is dropped. */
export function usePlaceOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CheckoutInput; idempotencyKey: string }) => checkoutApi.place(input, idempotencyKey),
    onSuccess: () => client.invalidateQueries({ queryKey: cartKeys.all }),
  })
}

export function useCancelOrder(number: string, token: string | null) {
  return useMutation({ mutationFn: () => ordersApi.cancel(number, token) })
}

export function useRequestReturn(number: string, token: string | null) {
  return useMutation({ mutationFn: (input: { lines: { orderLineId: string; quantity: number }[]; reason: string }) => ordersApi.requestReturn(number, token, input) })
}

export function useOrderLookup() {
  return useMutation({ mutationFn: ({ number, email }: { number: string; email: string }) => ordersApi.lookup(number, email) })
}
