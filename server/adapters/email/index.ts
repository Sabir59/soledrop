import "server-only"

import { serverEnv } from "@/lib/env.server"
import { createConsoleEmailProvider } from "@/server/adapters/email/console"
import { createResendEmailProvider } from "@/server/adapters/email/resend"
import { renderEventEmail } from "@/server/adapters/email/templates"
import type { OutboxEvent } from "@/server/platform/types"

export type EmailMessage = { to: string; subject: string; text: string; html: string }

/** An email vendor. Add one by implementing this and registering it below. */
export interface EmailProvider {
  readonly name: string
  send(message: EmailMessage): Promise<{ id: string }>
}

const providers: Record<string, () => EmailProvider> = {
  console: createConsoleEmailProvider,
  resend: () => createResendEmailProvider(serverEnv.RESEND_API_KEY ?? "", serverEnv.EMAIL_FROM),
}

let active: EmailProvider | undefined

/**
 * The configured email provider. `console` (default) logs instead of sending, so local runs
 * never email real people; production sets EMAIL_PROVIDER=resend.
 */
export function email() {
  active ??= providers[serverEnv.EMAIL_PROVIDER]()
  return {
    provider: active,
    send: (message: EmailMessage) => active!.send(message),
    async sendForEvent(event: OutboxEvent) {
      const message = renderEventEmail(event)
      if (message) await active!.send(message)
    },
  }
}
