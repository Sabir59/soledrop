"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { accountApi, authApi } from "@/api/account"
import { cartKeys } from "@/hooks/api/cart/queries"

export const accountKeys = { all: ["account"] as const }

export function useAccount() {
  return useQuery({ queryKey: accountKeys.all, queryFn: ({ signal }) => accountApi.get(signal), staleTime: 60_000 })
}

/** Signing in or out changes the bag (guest bag merges into the account's), so both caches refresh. */
function useSessionChange() {
  const client = useQueryClient()
  return () => Promise.all([client.invalidateQueries({ queryKey: accountKeys.all }), client.invalidateQueries({ queryKey: cartKeys.all })])
}

export function useLogin() {
  const refresh = useSessionChange()
  return useMutation({ mutationFn: authApi.login, onSuccess: refresh })
}

export function useRegister() {
  const refresh = useSessionChange()
  return useMutation({ mutationFn: authApi.register, onSuccess: refresh })
}

export function useLogout() {
  const refresh = useSessionChange()
  return useMutation({ mutationFn: authApi.logout, onSuccess: refresh })
}

export function useAccountMutation<Input, Output>(mutationFn: (input: Input) => Promise<Output>) {
  const client = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: accountKeys.all }) })
}
