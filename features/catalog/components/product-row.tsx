import { ProductCard } from "@/features/catalog/components/product-card"
import type { CardProduct } from "@/features/catalog/types/card"

/** Four product cards: a swipeable rail on small screens, the designed 4-up grid from `xl`. */
export function ProductRow({ products, priority = false }: { products: CardProduct[]; priority?: boolean }) {
  return (
    <ul className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto p-0.5 pb-2 xl:grid xl:grid-cols-4 xl:gap-6.75 xl:overflow-visible xl:p-0 3xl:grid-cols-cards">
      {products.map((product, index) => (
        <li key={product.id} className="shrink-0 basis-4/5 snap-start sm:basis-2/5 lg:basis-3/10 xl:basis-auto">
          <ProductCard product={product} priority={priority && index < 2} />
        </li>
      ))}
    </ul>
  )
}
