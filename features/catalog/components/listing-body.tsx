import { FiltersPanel } from "@/features/catalog/components/filters-panel"
import type { ListingView } from "@/features/catalog/components/listing-toolbar"
import { ProductResults } from "@/features/catalog/components/product-results"
import { hasFilters, type ListingState } from "@/features/catalog/lib/listing-url"
import { toCardProduct } from "@/features/catalog/types/card"
import type { FilterOptions } from "@/features/catalog/types/filters"
import type { ProductPage } from "@/server/catalog/types"

type ListingBodyProps = { pathname: string; state: ListingState; view: ListingView; results: ProductPage; filters: FilterOptions }

/** Filter sidebar (368 px) beside the product grid — shared by collection listings and Pre-Loved. */
export function ListingBody({ pathname, state, view, results, filters }: ListingBodyProps) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-listing lg:items-stretch lg:gap-8 3xl:gap-11">
      <FiltersPanel pathname={pathname} state={state} options={filters} />
      <ProductResults
        pathname={pathname}
        state={state}
        view={view}
        products={results.items.map(toCardProduct)}
        total={results.total}
        page={results.page}
        pageCount={results.pageCount}
        filtered={hasFilters(state)}
      />
    </div>
  )
}
