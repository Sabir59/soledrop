#!/usr/bin/env node
/**
 * After-fix evidence for qa/bugs.md: one screenshot per defect, in the state that used to fail.
 * Usage: node qa/bug-shots.mjs   (server on 127.0.0.1:3200) → qa/bugs/BUG-0xx.png
 */
import fs from "node:fs"

import { chromium, webkit } from "@playwright/test"

const BASE = "http://127.0.0.1:3200"
fs.mkdirSync("qa/bugs", { recursive: true })

const hydrated = (page) =>
  page.waitForFunction(() => {
    const header = document.querySelector("header")
    return !!header && Object.keys(header).some((key) => key.startsWith("__reactFiber"))
  })

const shots = [
  { id: "BUG-001", width: 390, route: "/", clip: { x: 0, y: 0, width: 390, height: 120 } },
  {
    id: "BUG-005",
    width: 1440,
    route: "/",
    act: async (page) => {
      const trigger = page.locator("header").first().getByRole("button", { name: "Men", exact: true })
      await trigger.focus()
      await page.keyboard.press("ArrowDown")
    },
  },
  {
    id: "BUG-006",
    width: 1440,
    route: "/",
    act: async (page) => {
      await page.getByRole("button", { name: "Search" }).click()
      await page.keyboard.type("n")
    },
    clip: { x: 0, y: 0, width: 1440, height: 200 },
  },
  { id: "BUG-008", width: 1440, route: "/search?q=nike", javaScript: false },
  {
    id: "BUG-011",
    width: 390,
    route: "/",
    act: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click()
      await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Men", exact: true }).click()
    },
  },
  { id: "BUG-012", width: 320, route: "/", footer: true },
  { id: "BUG-013", width: 320, route: "/contact", fullPage: true },
  { id: "BUG-014", width: 640, route: "/cart" },
]

const browser = await chromium.launch()
for (const shot of shots) {
  const context = await browser.newContext({ viewport: { width: shot.width, height: 900 }, javaScriptEnabled: shot.javaScript ?? true, reducedMotion: "reduce" })
  const page = await context.newPage()
  await page.goto(BASE + shot.route, { waitUntil: "load" })
  if (shot.javaScript !== false) await hydrated(page)
  if (shot.act) await shot.act(page)
  await page.waitForTimeout(400)
  const path = `qa/bugs/${shot.id}.png`
  if (shot.footer) await page.locator("footer").screenshot({ path })
  else await page.screenshot({ path, clip: shot.clip, fullPage: shot.fullPage ?? false })
  await context.close()
}
await browser.close()

// BUG-009/010: the bag in WebKit after adding a pair (assets load, cookie kept).
const engine = await webkit.launch()
const page = await engine.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${BASE}/products/nike-air-max`, { waitUntil: "load" })
await hydrated(page)
const size = page.getByRole("radio", { name: /42/ }).first()
await size.focus()
await page.keyboard.press("Space")
await page.getByRole("button", { name: "Add to cart", exact: true }).click()
await page.getByRole("button", { name: "Bag, 1 item" }).click()
await page.getByRole("dialog").getByText("NIKE Air Max").waitFor()
await page.screenshot({ path: "qa/bugs/BUG-009-010-webkit.png" })
await engine.close()
