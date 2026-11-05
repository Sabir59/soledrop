import type { ProductKind } from "@/server/catalog/types"

export type MenuOption = { kind: ProductKind; label: string; href: string }

export type MenuSection = { label: string; href: string; tone?: "brand"; options: MenuOption[] }
