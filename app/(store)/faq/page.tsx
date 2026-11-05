import type { Metadata } from "next"
import Link from "next/link"

import { ChevronDownIcon } from "@/components/icons"
import { Container } from "@/components/shared/container"
import { JsonLd } from "@/components/shared/json-ld"
import { PageBand } from "@/components/shared/page-band"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { faqPageData } from "@/server/storefront"

export const metadata: Metadata = {
  title: "FAQs",
  description: "Orders, payment, delivery, returns, pre-loved condition grades and sizing at Sole Drop.",
  alternates: { canonical: "/faq" },
}

/**
 * FAQs (screen 07). The design gives the band and an empty body (D-025): the body is a category
 * index beside the questions, one disclosure per question in the Product Information style.
 */
export default async function FaqPage() {
  const groups = await faqPageData()
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((group) =>
      group.items.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    ),
  }

  return (
    <>
      <JsonLd data={structured} />
      <PageBand display>FAQs</PageBand>
      <Container className="grid items-start gap-10 pt-10 pb-16 lg:grid-cols-[18rem_1fr] lg:gap-16 lg:pt-16 lg:pb-24 3xl:px-50">
        <nav aria-label="FAQ topics" className="lg:sticky lg:top-27.5">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {groups.map((group) => (
              <li key={group.anchor}>
                <a
                  href={`#${group.anchor}`}
                  className="flex min-h-11 items-center rounded-md border border-border px-4 text-16 font-semibold transition-colors hover:border-foreground lg:border-0 lg:px-0 lg:text-20 lg:hover:text-subtle-foreground lg:hover:underline"
                >
                  {group.category}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-12 lg:gap-16">
          {groups.map((group) => (
            <section key={group.anchor} id={group.anchor} aria-labelledby={`${group.anchor}-title`} className="scroll-mt-20 lg:scroll-mt-27.5">
              <h2 id={`${group.anchor}-title`} className="text-24 font-extrabold uppercase md:text-32">
                {group.category}
              </h2>
              <div className="flex flex-col pt-2">
                {group.items.map((faq) => (
                  <details key={faq.id} className="group border-b border-border-strong">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 md:py-6 [&::-webkit-details-marker]:hidden">
                      <h3 className="text-18 font-semibold md:text-22">{faq.question}</h3>
                      <ChevronDownIcon className="h-auto w-5 shrink-0 transition-transform duration-200 group-open:rotate-180 md:w-6" />
                    </summary>
                    <p className="max-w-prose pb-6 text-16 text-subtle-foreground md:text-18">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-col items-start gap-5 rounded-xl bg-surface p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex flex-col gap-1">
              <h2 className="text-22 font-extrabold uppercase md:text-26">Still have a question?</h2>
              <p className="text-16 text-subtle-foreground md:text-18">Message us or chat on WhatsApp — we reply within one working day.</p>
            </div>
            <Link href="/contact" className={cn(buttonVariants({ tone: "ink", size: "md" }), "shrink-0")}>
              Contact us
            </Link>
          </div>
        </div>
      </Container>
    </>
  )
}
