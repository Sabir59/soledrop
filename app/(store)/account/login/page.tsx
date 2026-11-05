import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthCard } from "@/features/account/components/auth-card"
import { LoginForm } from "@/features/account/components/auth-forms"
import { safeNext } from "@/features/account/lib/safe-next"
import { currentCustomer } from "@/server/http/route"

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ next?: string | string[] }> }

/** Sign in (derived). Already signed in: straight on to where the shopper was going. */
export default async function LoginPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next)
  if (await currentCustomer()) redirect(next)
  return (
    <AuthCard title="Sign in" description="Track orders, save addresses and check out faster.">
      <LoginForm next={next} />
    </AuthCard>
  )
}
