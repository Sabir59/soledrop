// SWAP → none: talks to the real BFF (`app/api/auth/*`, `app/api/account/*`).
import { request } from "@/api/http"
import type { AddressInput } from "@/features/checkout/schemas/checkout"
import type { CustomerAddress, CustomerProfile } from "@/server/customers/types"
import type { OrderDto } from "@/server/http/dto"

export type AccountResponse = { customer: CustomerProfile | null; orders: OrderDto[]; addresses: CustomerAddress[] }

export const authApi = {
  register: (input: { fullName: string; email: string; password: string; marketingOptIn: boolean }) =>
    request<{ customer: CustomerProfile }>("/api/auth/register", { method: "POST", body: input }),
  login: (input: { email: string; password: string }) => request<{ customer: CustomerProfile }>("/api/auth/login", { method: "POST", body: input }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) => request<{ ok: true }>("/api/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token: string, password: string) => request<{ ok: true }>("/api/auth/reset-password", { method: "POST", body: { token, password } }),
}

export const accountApi = {
  get: (signal?: AbortSignal) => request<AccountResponse>("/api/account", { signal }),
  updateProfile: (input: { fullName: string; phone: string | null; marketingOptIn: boolean }) => request<{ customer: CustomerProfile }>("/api/account", { method: "PATCH", body: input }),
  changePassword: (input: { currentPassword: string; newPassword: string }) => request<{ ok: true }>("/api/account/password", { method: "POST", body: input }),
  deleteAccount: (input: { password: string; confirm: string }) => request<void>("/api/account", { method: "DELETE", body: input }),
  saveAddress: (input: AddressInput & { isDefault: boolean }, id?: string) =>
    request<{ address: CustomerAddress }>(id ? `/api/account/addresses/${id}` : "/api/account/addresses", { method: id ? "PUT" : "POST", body: input }),
  deleteAddress: (id: string) => request<void>(`/api/account/addresses/${id}`, { method: "DELETE" }),
}
