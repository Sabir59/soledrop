import { announcement } from "@/content/navigation"

/** The lime strip above the header on Home. */
export function AnnouncementBar() {
  return (
    <p className="flex min-h-11.5 items-center justify-center bg-brand px-5 py-2 text-center text-14 font-bold text-brand-foreground md:text-18">
      {announcement}
    </p>
  )
}
