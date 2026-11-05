import type { Metadata } from "next"
import Link from "next/link"

import { Container } from "@/components/shared/container"
import { OrderDetails } from "@/features/orders/components/order-details"
import { orderPageData } from "@/server/http/orders"

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } }

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ token?: string; placed?: string }> }

/** Order confirmation and status (derived). Reached from checkout, the order email or order lookup. */
export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, { token, placed }] = await Promise.all([params, searchParams])
  const data = await orderPageData(number, token ?? null)

  if (!data) {
    return (
      <div className="bg-surface">
        <Container className="flex flex-col items-center gap-5 py-24 text-center md:py-32">
          <h1 className="text-34 font-bold tracking-tight-2 md:text-54">We couldn&rsquo;t open that order</h1>
          <p className="max-w-134 text-18 text-subtle-foreground md:text-20">
            The link may be incomplete, or the order belongs to another account. Find it with your order number and email instead.
          </p>
          <Link href="/orders/lookup" className="flex h-14 items-center rounded-xl bg-foreground px-8 text-20 font-semibold text-background hover:bg-brand hover:text-brand-foreground md:h-16">
            Find my order
          </Link>
        </Container>
      </div>
    )
  }

  return <OrderDetails order={data.order} next={data.next} token={token ?? null} justPlaced={placed === "1"} />
}
