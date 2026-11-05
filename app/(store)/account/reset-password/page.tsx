import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/features/account/components/auth-card"
import { ResetPasswordForm } from "@/features/account/components/auth-forms"

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ token?: string }> }

/** New password from the emailed link (derived). */
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams
  return (
    <AuthCard title="New password">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-18 text-subtle-foreground">
          This link is incomplete.{" "}
          <Link href="/account/forgot-password" className="font-semibold text-foreground underline underline-offset-4">
            Request a new one
          </Link>
          .
        </p>
      )}
    </AuthCard>
  )
}
