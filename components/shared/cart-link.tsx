"use client"

import Link from "next/link"

import { BagIcon } from "@/components/icons"
import { useCart } from "@/hooks/api/cart/queries"
import { cn } from "@/lib/utils"

/** Header bag icon with the live item count; the badge only appears once something is in the bag. */
export function CartLink({ className }: { className?: string }) {
  const { data } = useCart()
  const count = data?.cart.itemCount ?? 0
  const label = count === 0 ? "Bag, empty" : `Bag, ${count} ${count === 1 ? "item" : "items"}`

  return (
    <Link href="/cart" aria-label={label} className={cn(className, "3xl:pt-0")}>
      <BagIcon />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-badge leading-0 font-bold text-brand-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  )
}
