import type { ReactNode } from "react"

import { ChevronDownIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

export type InformationItem = { title: string; content: ReactNode }

/**
 * "Product Information": the white card of disclosure rows on the grey band (Frame 202). Native
 * <details> keeps every row keyboard- and screen-reader-operable without script; rows share a
 * `name`, so opening one closes the others.
 */
export function ProductInformation({ items, className }: { items: InformationItem[]; className?: string }) {
  return (
    <section aria-labelledby="product-information-title" className={cn("flex flex-col rounded-3xl bg-background px-5 pt-6 pb-6 md:px-10 3xl:pt-8.75", className)}>
      <h2 id="product-information-title" className="text-26 font-semibold md:text-32 3xl:text-44">
        Product Information
      </h2>
      <div className="flex flex-col pt-2 3xl:pe-2">
        {items.map((item) => (
          <details key={item.title} name="product-information" className="group border-b border-border-strong md:first:[&>summary]:pb-10.25">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 pt-6 pb-6 md:pt-10 md:pb-9.75 md:pe-14.75 [&::-webkit-details-marker]:hidden">
              <h3 className="text-20 font-semibold md:text-32">{item.title}</h3>
              <ChevronDownIcon className="h-auto w-5 shrink-0 transition-transform duration-200 group-open:rotate-180 md:w-7" />
            </summary>
            <div className="pb-8 md:pe-14.75">{item.content}</div>
          </details>
        ))}
      </div>
    </section>
  )
}
