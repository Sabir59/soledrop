"use client"

import { useQuery, type QueryClient } from "@tanstack/react-query"

import { cartApi, type CartResponse } from "@/api/cart"

export const cartKeys = { all: ["cart"] as const }

/** The shopper's bag. Server-rendered pages seed it; mutations replace it with the server's answer. */
export function useCart(initialData?: CartResponse) {
  return useQuery({ queryKey: cartKeys.all, queryFn: ({ signal }) => cartApi.get(signal), initialData, staleTime: 30_000 })
}

/** Mutations return the freshly priced cart, so it is written straight into the cache. */
export function setCart(client: QueryClient, data: CartResponse) {
  client.setQueryData(cartKeys.all, data)
}
