#!/usr/bin/env node
// Dev helper: prints page-level boxes (and optional extra selectors) for comparing against the
// design outline. Usage: node scripts/geom.mjs <route without leading slash> [width=1920] [selector...]
import { chromium } from "@playwright/test"

const [route = "", width = "1920", ...extra] = process.argv.slice(2)
const base = process.env.QA_BASE_URL ?? "http://localhost:3100"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 1080 }, reducedMotion: "reduce" })
await page.goto(`${base}/${route}`, { waitUntil: "networkidle" })
await page.evaluate(() => document.fonts.ready)
const selectors = ["body > p", "header", "main > section", "main > div > section", "footer > *", ...extra]
const rows = await page.evaluate((list) => {
  const out = []
  for (const selector of list) {
    for (const element of document.querySelectorAll(selector)) {
      const box = element.getBoundingClientRect()
      const label = (element.getAttribute("aria-labelledby") ?? element.id ?? "") || element.textContent.trim().slice(0, 30)
      out.push(`${selector.padEnd(22)} ${label.padEnd(32)} x=${box.x.toFixed(2)} y=${(box.y + window.scrollY).toFixed(2)} w=${box.width.toFixed(2)} h=${box.height.toFixed(2)}`)
    }
  }
  return out
}, selectors)
console.log(rows.join("\n"))
await browser.close()
