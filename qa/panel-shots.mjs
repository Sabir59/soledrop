// Screenshots of every header panel state at a desktop and a mobile width, for visual review
// (qa/out/panels/<state>-<width>.png). Needs the production server: node qa/serve.mjs 3200.
import fs from "node:fs"
import path from "node:path"

import { chromium } from "@playwright/test"

const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:3200"
const OUT = path.resolve(import.meta.dirname, "out/panels")
const WIDTHS = (process.env.WIDTHS ?? "1440,390").split(",").map(Number)
const STATES = (process.env.STATES ?? "closed,mega-open,search-open,search-typing,search-none,account-open,cart-open,drawer-open,drawer-level").split(",")
const DARK = process.env.DARK === "1"

fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

async function open(page, state, width) {
  const header = page.locator("header").first()
  if (state === "mega-open") {
    if (width < 1024) return false
    await header.getByRole("button", { name: "Men", exact: true }).hover()
    await page.waitForTimeout(400)
  } else if (state.startsWith("search")) {
    await header.getByRole("button", { name: "Search" }).click()
    await page.waitForTimeout(600)
    if (state === "search-typing") await page.keyboard.type("nike")
    if (state === "search-none") await page.keyboard.type("kayanno zzqx")
    await page.waitForTimeout(900)
  } else if (state === "account-open") {
    await header.getByRole("button", { name: /^Account/ }).click()
    await page.waitForTimeout(600)
  } else if (state === "cart-open") {
    await header.getByRole("button", { name: /^Bag/ }).click()
    await page.waitForTimeout(900)
  } else if (state.startsWith("drawer")) {
    if (width >= 1024) return false
    await header.getByRole("button", { name: "Open menu" }).click()
    await page.waitForTimeout(500)
    if (state === "drawer-level") {
      await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Men", exact: true }).click()
      await page.waitForTimeout(400)
    }
  }
  return true
}

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, colorScheme: DARK ? "dark" : "light", reducedMotion: "reduce" })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()))
  for (const state of STATES) {
    await page.goto(`${BASE}${process.env.ROUTE ?? "/"}`, { waitUntil: "load" })
    await page.waitForTimeout(1500)
    if (!(await open(page, state, width))) continue
    const file = path.join(OUT, `${state}-${width}${DARK ? "-dark" : ""}.png`)
    await page.screenshot({ path: file })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    console.log(`${state} @ ${width}: ${path.relative(process.cwd(), file)} overflowX=${overflow}`)
  }
  if (errors.length) console.log(`errors @ ${width}:`, [...new Set(errors)].join("\n"))
  await context.close()
}
await browser.close()
