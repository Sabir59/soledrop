import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthCard } from "@/features/account/components/auth-card"
import { RegisterForm } from "@/features/account/components/auth-forms"
import { safeNext } from "@/features/account/lib/safe-next"
import { currentCustomer } from "@/server/http/route"

export const metadata: Metadata = { title: "Create an account", robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ next?: string | string[] }> }

/** Registration (derived). Your bag comes with you. */
export default async function RegisterPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next)
  if (await currentCustomer()) redirect(next)
  return (
    <AuthCard title="Create an account" description="Your bag comes with you.">
      <RegisterForm next={next} />
    </AuthCard>
  )
}
