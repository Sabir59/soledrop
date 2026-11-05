import "server-only"

import type { CatalogRepository } from "@/server/catalog/repository"
import { db, transaction } from "@/server/fixtures/store"

export function createFixturesCatalogRepository(): CatalogRepository {
  return {
    async listProducts(storeId) {
      return db().products.filter((product) => product.storeId === storeId && product.status === "active")
    },
    async getProductBySlug(storeId, slug) {
      return db().products.find((product) => product.storeId === storeId && product.slug === slug && product.status === "active") ?? null
    },
    async getProductsByVariantIds(variantIds) {
      const wanted = new Set(variantIds)
      return db().products.filter((product) => product.variants.some((variant) => wanted.has(variant.id)))
    },
    async listCollections(storeId) {
      return db().collections.filter((collection) => collection.storeId === storeId).sort((a, b) => a.position - b.position)
    },
    async listBrands() {
      return [...db().brands].sort((a, b) => a.position - b.position)
    },
    async listAttributeDefinitions() {
      return db().attributeDefinitions
    },
    async listCustomFieldDefinitions() {
      return db().customFieldDefinitions
    },
    async upsertProducts(storeId, incoming) {
      return transaction((tables) => {
        for (const product of incoming) {
          const index = tables.products.findIndex((existing) => existing.storeId === storeId && existing.slug === product.slug)
          if (index === -1) tables.products.push({ ...product, storeId })
          else tables.products[index] = { ...product, id: tables.products[index].id, storeId }
          for (const variant of product.variants) {
            if (!tables.inventory.some((row) => row.variantId === variant.id)) tables.inventory.push({ variantId: variant.id, onHand: 0, reserved: 0 })
          }
        }
        return incoming.length
      })
    },
  }
}
