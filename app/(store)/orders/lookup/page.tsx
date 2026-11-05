import type { Metadata } from "next"

import { PageBand } from "@/components/shared/page-band"
import { Container } from "@/components/shared/container"
import { OrderLookupForm } from "@/features/orders/components/order-lookup-form"

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your Sole Drop order with your order number and email.",
  alternates: { canonical: "/orders/lookup" },
}

/** Guest order tracking (derived): order number + checkout email opens the order page. */
export default function OrderLookupPage() {
  return (
    <div className="bg-surface">
      <PageBand description="Enter the order number from your confirmation email.">Track your order</PageBand>
      <Container className="flex justify-center pt-10 pb-20 md:pt-16 md:pb-28">
        <div className="w-full max-w-160 rounded-panel bg-background p-5 shadow-card-lift md:p-10">
          <OrderLookupForm />
        </div>
      </Container>
    </div>
  )
}
