import { createCn } from "cn/engine"

import tables from "@/lib/cn-tables"

/**
 * Tailwind class merger fitted to our theme: the generated tables know the token scales
 * (font sizes, colours, radii), so a size like `text-30` never knocks out a colour like
 * `text-brand`. Regenerate after token changes: `node node_modules/cn/bin/cn.mjs build --full -o lib/cn-tables.ts`.
 */
export const cn = createCn(tables)
