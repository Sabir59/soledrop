// SWAP → none: talks to the real BFF (`app/api/contact`, `app/api/newsletter`).
import { request } from "@/api/http"

export const contentApi = {
  contact: (input: { name: string; email: string; orderNumber?: string; message: string; website?: string }) => request<{ ok: true }>("/api/contact", { method: "POST", body: input }),
  subscribe: (email: string, source: string, website?: string) => request<{ ok: true; created: boolean }>("/api/newsletter", { method: "POST", body: { email, source, website } }),
  unsubscribe: (email: string, token: string) => request<{ ok: boolean }>("/api/newsletter", { method: "DELETE", body: { email, token } }),
}
