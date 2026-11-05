import { createCn } from "cn/engine"

import tables from "../lib/cn-tables.ts"

const cn = createCn(tables)
console.log(cn("text-brand text-30"), "|", cn("text-background text-16 text-foreground"), "|", cn("rounded-lg rounded-2xl"))
