import { cn } from "@/lib/utils"

/**
 * Top Brands (D-050): the brand names run past in a continuous loop, for show only (no links, no
 * hover change, no controls). The list is rendered twice and slides by one copy's width; each name
 * carries its own trailing space so the gap is the same everywhere, including across the seam. With
 * reduced motion the names sit still in one wrapping row.
 */
export function BrandMarquee({ title, brands }: { title: string; brands: readonly string[] }) {
  return (
    <div className="flex flex-col gap-8 md:gap-16">
      <h2 id="brands-title" className="text-28 font-extrabold md:text-40">
        {title}
      </h2>
      <div className="overflow-hidden mask-fade-x motion-reduce:mask-none">
        <div className="flex w-max animate-marquee motion-reduce:block motion-reduce:w-auto motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 || undefined} className={cn("flex shrink-0 motion-reduce:flex-wrap motion-reduce:gap-y-4", copy === 1 && "motion-reduce:hidden")}>
              {brands.map((brand) => (
                <li key={brand} className="shrink-0 pe-12 text-28 font-bold whitespace-nowrap text-subtle-foreground select-none md:pe-21.5 md:text-40">
                  {brand}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}
