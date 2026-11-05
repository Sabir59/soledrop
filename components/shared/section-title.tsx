import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Section heading used by Shop by category, New Arrival, Pre-Loved Drops and "You may also like" (ExtraBold 68/68, −1 %). */
export function SectionTitle({ id, children, display = false }: { id: string; children: ReactNode; display?: boolean }) {
  return (
    <h2 id={id} className={cn("text-34 leading-none font-extrabold tracking-tight-1 uppercase md:text-48 xl:text-56 3xl:text-68", display && "font-display")}>
      {children}
    </h2>
  )
}
