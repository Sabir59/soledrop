import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { CheckoutView } from "@/features/checkout/components/checkout-view"
import { cartSnapshot } from "@/server/http/cart"
import { checkoutContext } from "@/server/http/checkout"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
}

/** Checkout (derived). An empty bag goes back to the bag page, which has the designed empty state. */
export default async function CheckoutPage() {
  const [{ cart }, context] = await Promise.all([cartSnapshot(), checkoutContext()])
  if (cart.lines.length === 0) redirect("/cart")
  return <CheckoutView context={context} />
}
