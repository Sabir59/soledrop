import Link from "next/link"

import { EmptyBagIcon } from "@/components/icons"

const action =
  "flex h-14 w-full items-center justify-center rounded-xl bg-foreground text-20 font-semibold text-background transition-colors hover:bg-brand hover:text-brand-foreground md:h-16 md:w-80 md:text-24"

/** Empty bag (design 09): illustration, heading, two lines of guidance and both shop entrances. */
export function EmptyBag() {
  return (
    <div className="flex flex-col items-center px-5 pt-20 pb-24 text-center md:pt-30 3xl:pt-86 3xl:pb-110.5">
      {/* The drawing's strokes overhang its 140×108 frame by half a pixel; the frame sets the layout. */}
      <span className="flex h-22 w-28 items-center justify-center md:h-27 md:w-35">
        <EmptyBagIcon aria-hidden="true" className="h-auto w-28 shrink-0 md:w-35.25" />
      </span>
      <h1 id="bag-title" tabIndex={-1} className="pt-8 outline-none text-34 font-bold tracking-tight-2 md:pt-10 md:text-54">Your bag is waiting for a pair</h1>
      <p className="max-w-134 pt-3.5 text-18 leading-7.5 font-medium text-subtle-foreground md:text-20 md:leading-8.5">
        Looks like you haven&rsquo;t added any shoes to your bag yet. Explore our latest drops and find your next favorite pair.
      </p>
      {/* Side by side from md: two 320 px buttons and the gap need 674 px, more than sm's 600 px column. */}
      <div className="flex w-full max-w-80 flex-col items-center gap-4 pt-10 md:w-auto md:max-w-none md:flex-row md:gap-8.5 md:pt-14">
        <Link href="/collections/brand-new" className={action}>
          Shop Brand New
        </Link>
        <Link href="/pre-loved" className={action}>
          Shop Pre-Loved
        </Link>
      </div>
    </div>
  )
}
