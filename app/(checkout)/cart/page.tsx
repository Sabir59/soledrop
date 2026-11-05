import type { Metadata } from "next"

import { CartView } from "@/features/cart/components/cart-view"
import { cartSnapshot } from "@/server/http/cart"

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
}

/** The bag (designs 09 empty / 10 filled), rendered from the shopper's cart cookie. */
export default async function CartPage() {
  return <CartView initial={await cartSnapshot()} />
}
