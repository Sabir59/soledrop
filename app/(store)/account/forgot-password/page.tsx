import type { Metadata } from "next"

import { AuthCard } from "@/features/account/components/auth-card"
import { ForgotPasswordForm } from "@/features/account/components/auth-forms"

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } }

/** Password reset request (derived). The answer is the same whether or not the email has an account. */
export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset password" description="We will email you a link to choose a new one.">
      <ForgotPasswordForm />
    </AuthCard>
  )
}
