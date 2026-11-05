import "server-only"

import type { EmailProvider } from "@/server/adapters/email"
import { newId } from "@/server/shared/ids"

/** Development provider: records messages in memory and logs a one-line summary. */
export const sentEmails: { id: string; to: string; subject: string; text: string }[] = []

export function createConsoleEmailProvider(): EmailProvider {
  return {
    name: "console",
    async send(message) {
      const id = newId()
      sentEmails.push({ id, to: message.to, subject: message.subject, text: message.text })
      if (sentEmails.length > 200) sentEmails.shift()
      console.info(`[email:console] to=${message.to.replace(/(.{2}).*@/, "$1…@")} subject="${message.subject}"`)
      return { id }
    },
  }
}
