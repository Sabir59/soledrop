import type { Metadata } from "next"

import { AuthCard } from "@/features/account/components/auth-card"
import { UnsubscribeConfirm } from "@/features/content/components/unsubscribe-confirm"

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ email?: string; token?: string }> }

/** Newsletter unsubscribe from the signed link in every newsletter (derived). */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { email, token } = await searchParams
  return (
    <AuthCard title="Unsubscribe">
      {email && token ? (
        <UnsubscribeConfirm email={email} token={token} />
      ) : (
        <p className="text-18 text-subtle-foreground md:text-20">This link is incomplete. Use the unsubscribe link at the bottom of any newsletter.</p>
      )}
    </AuthCard>
  )
}
