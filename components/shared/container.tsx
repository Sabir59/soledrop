import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * Page-width wrapper: the one place that centres content. At the designed 1920 width it leaves the
 * design's 120 px gutters (1680 content); narrower viewports get proportionally smaller gutters.
 */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-480 px-5 md:px-10 xl:px-16 3xl:px-30", className)} {...props} />
}
