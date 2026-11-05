import type { AttributeDefinition, Brand, Collection, CustomFieldDefinition, Product } from "@/server/catalog/types"

/** Catalogue reads. Both drivers return only `active` products unless `includeDrafts` is set. */
export interface CatalogRepository {
  listProducts(storeId: string): Promise<Product[]>
  getProductBySlug(storeId: string, slug: string): Promise<Product | null>
  getProductsByVariantIds(variantIds: string[]): Promise<Product[]>
  listCollections(storeId: string): Promise<Collection[]>
  listBrands(storeId: string): Promise<Brand[]>
  listAttributeDefinitions(storeId: string): Promise<AttributeDefinition[]>
  listCustomFieldDefinitions(storeId: string): Promise<CustomFieldDefinition[]>
  /** Import: insert or update by slug; returns the number of rows written. */
  upsertProducts(storeId: string, products: Product[]): Promise<number>
}
