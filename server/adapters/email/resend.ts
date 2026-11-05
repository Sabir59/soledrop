import "server-only"

import type { EmailProvider } from "@/server/adapters/email"

/** Resend (https://resend.com) over its REST API; the key stays on the server. */
export function createResendEmailProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(message) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) throw new Error(`Resend answered ${response.status}`)
      const body = (await response.json()) as { id: string }
      return { id: body.id }
    },
  }
}
