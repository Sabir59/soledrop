import type { SynonymGroup } from "@/server/search/types"

/**
 * Starting synonym groups: the words shoppers in Pakistan use for the same thing. Merchants edit
 * them in the search_synonyms table; searching any word of a group also finds the others.
 */
export const searchSeed: { synonyms: SynonymGroup[] } = {
  synonyms: [
    { id: "60000000-0000-4000-8000-000000000001", term: "sneakers", synonyms: ["trainers", "kicks", "joggers"] },
    { id: "60000000-0000-4000-8000-000000000002", term: "running", synonyms: ["runners", "jogging"] },
    { id: "60000000-0000-4000-8000-000000000003", term: "pre-loved", synonyms: ["preloved", "used", "second hand", "thrift"] },
    { id: "60000000-0000-4000-8000-000000000004", term: "new balance", synonyms: ["nb"] },
    { id: "60000000-0000-4000-8000-000000000005", term: "grey", synonyms: ["gray"] },
    { id: "60000000-0000-4000-8000-000000000006", term: "sketchers", synonyms: ["skechers"] },
  ],
}
