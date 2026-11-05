"use client"

import { useEffect, useRef, useState } from "react"

import type { CartResponse } from "@/api/cart"
import { Container } from "@/components/shared/container"
import { CartLineItem } from "@/features/cart/components/cart-line-item"
import { EmptyBag } from "@/features/cart/components/empty-bag"
import { OrderSummary } from "@/features/cart/components/order-summary"
import { useCart } from "@/hooks/api/cart/queries"
import { useRemoveCartLine, useUpdateCartLine } from "@/hooks/api/cart/useCartMutations"

/**
 * The bag (designs 09 and 10). Seeded with the server-rendered cart; every change goes to the
 * server and the re-priced cart it returns replaces the view. Changes are announced politely,
 * and a removal moves focus to the next line (or the summary) so keyboard users don't lose
 * their place.
 */
export function CartView({ initial }: { initial: CartResponse }) {
  const { data } = useCart(initial)
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()
  const [announcement, setAnnouncement] = useState("")
  /** Index of a just-removed line; focus moves once the re-priced bag has rendered and the buttons are enabled again. */
  const removedAt = useRef<number | null>(null)
  const cart = (data ?? initial).cart
  const busy = update.isPending || remove.isPending

  useEffect(() => {
    if (busy || removedAt.current === null) return
    const targets = document.querySelectorAll<HTMLElement>("[data-cart-focus]")
    const target = targets[Math.min(removedAt.current, targets.length - 1)] ?? document.getElementById("bag-title")
    removedAt.current = null
    target?.focus()
  }, [busy, cart.lines.length])

  if (cart.lines.length === 0) {
    return (
      <div className="bg-background">
        <p role="status" className="sr-only">
          {announcement}
        </p>
        <EmptyBag />
      </div>
    )
  }

  const failed = update.error ?? remove.error
  const blocked = cart.warnings.length > 0 || cart.lines.some((line) => !line.available)

  return (
    <div className="bg-surface">
      <Container className="grid items-start gap-8 pt-8 pb-16 lg:grid-cols-cart lg:gap-5 3xl:px-20 3xl:pt-52.75 3xl:pb-42.5">
        <section aria-labelledby="bag-title" className="flex min-w-0 flex-col gap-5">
          <h1 id="bag-title" className="sr-only">
            Your bag, {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
          </h1>
          {cart.warnings.length > 0 || failed ? (
            <div role="alert" className="flex flex-col gap-1 rounded-lg border-2 border-destructive bg-background px-5 py-4 text-16 font-medium text-destructive md:text-18">
              {cart.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              {failed ? <p>{failed.message || "We couldn't update your bag. Please try again."}</p> : null}
            </div>
          ) : null}
          <ul className="flex flex-col gap-5">
            {cart.lines.map((line, index) => (
              <CartLineItem
                key={line.id}
                line={line}
                currency={cart.currency}
                busy={busy}
                onQuantity={(quantity) =>
                  update.mutate(
                    { lineId: line.id, quantity },
                    { onSuccess: () => setAnnouncement(`${line.title}: quantity ${quantity}.`) },
                  )
                }
                onRemove={() =>
                  remove.mutate(line.id, {
                    onSuccess: () => {
                      setAnnouncement(`${line.title} removed from your bag.`)
                      removedAt.current = index
                    },
                  })
                }
              />
            ))}
          </ul>
        </section>
        <OrderSummary cart={cart} blocked={blocked} />
      </Container>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
