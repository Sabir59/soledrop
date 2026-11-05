import type { CollectionRule, Product, ProductView } from "@/server/catalog/types"

/**
 * Small, declarative rules engine shared by rule-based collections and promotions. Rules are
 * data (stored as JSON), evaluated here, so new merchandising doesn't need a deploy.
 */

const DAY = 24 * 60 * 60 * 1000

/** True when the product matches one collection rule. */
export function matchesCollectionRule(product: Product | ProductView, rule: CollectionRule, at = Date.now()): boolean {
  switch (rule.field) {
    case "kind":
      return product.kind === rule.equals
    case "gender":
      return rule.in.includes(product.gender)
    case "tag":
      return product.tags.includes(rule.equals)
    case "onSale":
      return "price" in product ? (product.price.compareAt !== null && product.price.compareAt > product.price.amount) === rule.equals : false
    case "publishedWithinDays":
      return at - Date.parse(product.publishedAt) <= rule.days * DAY
  }
}

/** True when the product matches every rule (an empty rule list matches nothing). */
export function matchesAllRules(product: Product | ProductView, rules: CollectionRule[], at = Date.now()): boolean {
  return rules.length > 0 && rules.every((rule) => matchesCollectionRule(product, rule, at))
}
