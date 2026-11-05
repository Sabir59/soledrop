"use client"

import { useMutation } from "@tanstack/react-query"

import { contentApi } from "@/api/content"

export function useSubscribe() {
  return useMutation({ mutationFn: ({ email, source, website }: { email: string; source: string; website?: string }) => contentApi.subscribe(email, source, website) })
}

export function useUnsubscribe() {
  return useMutation({ mutationFn: ({ email, token }: { email: string; token: string }) => contentApi.unsubscribe(email, token) })
}

export function useContact() {
  return useMutation({ mutationFn: contentApi.contact })
}
