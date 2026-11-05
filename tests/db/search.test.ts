import type { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { as, freshDatabase, ids, seed, STORE } from "./harness"

let db: PGlite

beforeAll(async () => {
  db = await freshDatabase()
  await seed(db)
  await db.exec(`
    insert into public.search_synonyms (store_id, term, synonyms) values ('${STORE}', 'sneakers', '{trainers,kicks}');
    insert into public.search_queries (store_id, query, normalized, result_count, clicked_slug, source, created_at) values
      ('${STORE}', 'Kayano', 'kayano', 3, null, 'overlay', now()),
      ('${STORE}', 'kayano', 'kayano', 3, null, 'page', now()),
      ('${STORE}', 'Asics', 'asics', 5, null, 'overlay', now()),
      ('${STORE}', 'zzqx', 'zzqx', 0, null, 'overlay', now()),
      ('${STORE}', 'zzqx', 'zzqx', 0, null, 'overlay', now()),
      ('${STORE}', 'zzqx', 'zzqx', 0, null, 'overlay', now()),
      ('${STORE}', 'kayano', 'kayano', null, 'asics-gel-kayano', 'overlay', now()),
      ('${STORE}', 'kayano', 'kayano', null, 'asics-gel-kayano', 'overlay', now()),
      ('${STORE}', 'old', 'old', 9, null, 'page', now() - interval '40 days');
  `)
})

afterAll(async () => {
  await db.close()
})

const attempt = async (sql: string) => {
  try {
    const result = await db.query(sql)
    return { ok: true as const, rows: result.rows.length, affected: result.affectedRows ?? 0 }
  } catch (error) {
    return { ok: false as const, message: (error as Error).message }
  }
}

describe("search tables", () => {
  it("let shoppers read synonyms but never change them", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await as(db, role, role === "anon" ? null : ids.stranger, async () => {
        expect(await attempt(`select * from public.search_synonyms`)).toMatchObject({ ok: true, rows: 1 })
        expect(await attempt(`update public.search_synonyms set synonyms = '{x}'`)).toMatchObject(role === "anon" ? { ok: false } : { ok: true, affected: 0 })
        expect(await attempt(`insert into public.search_synonyms (store_id, term, synonyms) values ('${STORE}', 'x', '{y}')`)).toMatchObject({ ok: false })
      })
    }
  })

  it("let owners manage synonyms and keep support staff read-only", async () => {
    await as(db, "authenticated", ids.support, async () => {
      expect(await attempt(`update public.search_synonyms set synonyms = '{x}'`)).toMatchObject({ ok: true, affected: 0 })
    })
    await as(db, "authenticated", ids.owner, async () => {
      expect(await attempt(`insert into public.search_synonyms (store_id, term, synonyms) values ('${STORE}', 'grey', '{gray}')`)).toMatchObject({ ok: true, affected: 1 })
      expect(await attempt(`delete from public.search_synonyms where term = 'grey'`)).toMatchObject({ ok: true, affected: 1 })
    })
  })

  it("hide the search log from shoppers and support staff, and show it to owners", async () => {
    await as(db, "anon", null, async () => {
      expect(await attempt(`select * from public.search_queries`)).toMatchObject({ ok: false })
      expect(await attempt(`insert into public.search_queries (store_id, query, normalized, result_count, source) values ('${STORE}', 'x', 'x', 0, 'page')`)).toMatchObject({ ok: false })
    })
    await as(db, "authenticated", ids.stranger, async () => {
      expect(await attempt(`select * from public.search_queries`)).toMatchObject({ ok: true, rows: 0 })
      expect(await attempt(`insert into public.search_queries (store_id, query, normalized, result_count, source) values ('${STORE}', 'x', 'x', 0, 'page')`)).toMatchObject({ ok: false })
    })
    await as(db, "authenticated", ids.support, async () => {
      expect(await attempt(`select * from public.search_queries`)).toMatchObject({ ok: true, rows: 0 })
    })
    await as(db, "authenticated", ids.owner, async () => {
      expect(await attempt(`select * from public.search_queries`)).toMatchObject({ ok: true, rows: 9 })
    })
  })

  it("reject a log row that is both a search and a click, or neither", async () => {
    expect(await attempt(`insert into public.search_queries (store_id, query, normalized, result_count, clicked_slug, source) values ('${STORE}', 'x', 'x', 1, 'y', 'page')`)).toMatchObject({ ok: false })
    expect(await attempt(`insert into public.search_queries (store_id, query, normalized, source) values ('${STORE}', 'x', 'x', 'page')`)).toMatchObject({ ok: false })
    expect(await attempt(`insert into public.search_queries (store_id, query, normalized, result_count, source) values ('${STORE}', 'x', 'x', 1, 'email')`)).toMatchObject({ ok: false })
  })
})

describe("search_trending", () => {
  it("counts recent searches that found something, not clicks, zero-result or old searches", async () => {
    const { rows } = await db.query<{ query: string; count: number }>(`select query, count::int as count from public.search_trending('${STORE}', 30, 10)`)
    expect(rows).toEqual([
      { query: "kayano", count: 2 },
      { query: "asics", count: 1 },
    ])
  })

  it("clamps the limit and window", async () => {
    expect((await db.query(`select * from public.search_trending('${STORE}', 0, 1)`)).rows).toHaveLength(1)
    expect((await db.query(`select * from public.search_trending('${STORE}', 30, -5)`)).rows).toHaveLength(1)
  })

  it("is callable by the service role only", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await as(db, role, ids.owner, async () => {
        expect(await attempt(`select * from public.search_trending('${STORE}', 30, 5)`)).toMatchObject({ ok: false, message: expect.stringMatching(/permission denied/) })
      })
    }
    await as(db, "service_role", null, async () => {
      expect(await attempt(`select * from public.search_trending('${STORE}', 30, 5)`)).toMatchObject({ ok: true, rows: 2 })
    })
  })

  it("can use the trigram index for fuzzy merchant reports", async () => {
    const { rows } = await db.query<{ normalized: string }>(`select distinct normalized from public.search_queries where normalized operator(extensions.%) 'kayanno'`)
    expect(rows.map((row) => row.normalized)).toEqual(["kayano"])
  })
})
