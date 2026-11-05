import "server-only"

import type { CatalogRepository } from "@/server/catalog/repository"
import type { AttributeDefinition, Brand, Collection, CustomFieldDefinition, Product } from "@/server/catalog/types"
import { supabase, unwrap } from "@/server/db/supabase"

/** Columns selected for a product, with brand, images, variants and collection slugs embedded. */
const PRODUCT_SELECT = `
  id, store_id, slug, title, kind, gender, status, description, condition_grade, condition_notes,
  attributes, custom_fields, tags, position, published_at, seo,
  brand:brands(id, slug, name, position),
  images:product_images(url, alt, width, height, role, position),
  variants(id, sku, size_eu, size_uk, size_us, size_cm, attributes, weight_grams, position),
  collection_products(collection:collections(slug))
`

type ProductRecord = {
  id: string
  store_id: string
  slug: string
  title: string
  kind: Product["kind"]
  gender: Product["gender"]
  status: Product["status"]
  description: string
  condition_grade: Product["condition"]
  condition_notes: string | null
  attributes: Product["attributes"]
  custom_fields: Product["customFields"]
  tags: string[]
  position: number
  published_at: string
  seo: Product["seo"]
  brand: Brand
  images: { url: string; alt: string; width: number; height: number; role: "card" | "gallery"; position: number }[]
  variants: { id: string; sku: string; size_eu: string; size_uk: string; size_us: string; size_cm: string; attributes: Record<string, string>; weight_grams: number; position: number }[]
  collection_products: { collection: { slug: string } | null }[]
}

function toProduct(record: ProductRecord): Product {
  return {
    id: record.id,
    storeId: record.store_id,
    slug: record.slug,
    title: record.title,
    brand: record.brand,
    kind: record.kind,
    gender: record.gender,
    status: record.status,
    description: record.description,
    condition: record.condition_grade,
    conditionNotes: record.condition_notes,
    images: [...record.images].sort((a, b) => a.position - b.position).map(({ url, alt, width, height, role }) => ({ url, alt, width, height, role })),
    variants: [...record.variants]
      .sort((a, b) => a.position - b.position)
      .map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: { eu: variant.size_eu, uk: variant.size_uk, us: variant.size_us, cm: variant.size_cm },
        attributes: variant.attributes,
        weightGrams: variant.weight_grams,
        position: variant.position,
      })),
    attributes: record.attributes,
    customFields: record.custom_fields,
    collections: record.collection_products.flatMap((link) => (link.collection ? [link.collection.slug] : [])),
    tags: record.tags,
    position: record.position,
    publishedAt: record.published_at,
    seo: record.seo,
  }
}

export function createSupabaseCatalogRepository(): CatalogRepository {
  return {
    async listProducts(storeId) {
      const rows = unwrap(
        await supabase().from("products").select(PRODUCT_SELECT).eq("store_id", storeId).eq("status", "active").order("position"),
      ) as unknown as ProductRecord[]
      return rows.map(toProduct)
    },
    async getProductBySlug(storeId, slug) {
      const row = unwrap(
        await supabase().from("products").select(PRODUCT_SELECT).eq("store_id", storeId).eq("slug", slug).eq("status", "active").maybeSingle(),
      ) as unknown as ProductRecord | null
      return row ? toProduct(row) : null
    },
    async getProductsByVariantIds(variantIds) {
      if (variantIds.length === 0) return []
      const productIds = unwrap(await supabase().from("variants").select("product_id").in("id", variantIds)) as { product_id: string }[]
      const ids = [...new Set(productIds.map((row) => row.product_id))]
      const rows = unwrap(await supabase().from("products").select(PRODUCT_SELECT).in("id", ids)) as unknown as ProductRecord[]
      return rows.map(toProduct)
    },
    async listCollections(storeId) {
      const rows = unwrap(
        await supabase()
          .from("collections")
          .select("id, store_id, slug, title, headline, description, kind, rules, image, position, seo")
          .eq("store_id", storeId)
          .order("position"),
      ) as { id: string; store_id: string; slug: string; title: string; headline: [string, string]; description: string; kind: Collection["kind"]; rules: Collection["rules"]; image: Collection["image"]; position: number; seo: Collection["seo"] }[]
      return rows.map((row) => ({ ...row, storeId: row.store_id }))
    },
    async listBrands(storeId) {
      return unwrap(await supabase().from("brands").select("id, slug, name, position").eq("store_id", storeId).order("position")) as Brand[]
    },
    async listAttributeDefinitions(storeId) {
      return unwrap(
        await supabase().from("attribute_definitions").select("code, label, type, scope, options, filterable, position").eq("store_id", storeId).order("position"),
      ) as AttributeDefinition[]
    },
    async listCustomFieldDefinitions(storeId) {
      const rows = unwrap(
        await supabase().from("custom_field_definitions").select("entity, code, label, type, required, visible_on_storefront").eq("store_id", storeId),
      ) as (Omit<CustomFieldDefinition, "visibleOnStorefront"> & { visible_on_storefront: boolean })[]
      return rows.map(({ visible_on_storefront, ...row }) => ({ ...row, visibleOnStorefront: visible_on_storefront }))
    },
    async upsertProducts(storeId, products) {
      const result = unwrap(
        await supabase().rpc("import_products", { p_store_id: storeId, p_products: products }),
      ) as number
      return result
    },
  }
}
