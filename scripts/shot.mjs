#!/usr/bin/env node
// Dev helper: full-page screenshot of a route at a given width, optionally downscaled for review.
// Usage: node scripts/shot.mjs <route without leading slash, "" for home> <out.png> [width=1920] [previewWidth]
import { chromium } from "@playwright/test"
import { createRequire } from "node:module"
import path from "node:path"

// sharp is a transitive dependency (via next); resolve it from the pnpm store like the design scripts do.
const sharp = createRequire(import.meta.url)(path.resolve("node_modules/.pnpm/sharp@0.35.5_@types+node@20.19.43/node_modules/sharp"))

const [route = "/", out = ".qa-tmp/shot.png", width = "1920", preview] = process.argv.slice(2)
const base = process.env.QA_BASE_URL ?? "http://localhost:3100"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 1080 }, reducedMotion: "reduce" })
await page.goto(base + "/" + route.replace(/^\/+/, ""), { waitUntil: "networkidle" })
await page.evaluate(() => document.fonts.ready)
// Lazy images only load once near the viewport: walk the page, then wait for every image.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 800) {
    window.scrollTo(0, y)
    await new Promise((resolve) => setTimeout(resolve, 60))
  }
  window.scrollTo(0, 0)
  // Only rendered images: lazy images inside closed (hidden) header panels never load.
  await Promise.all([...document.images].filter((image) => image.getClientRects().length > 0).map((image) => (image.complete ? null : new Promise((resolve) => image.addEventListener("load", resolve, { once: true }) || image.addEventListener("error", resolve, { once: true })))))
})
await page.waitForTimeout(300)
const buffer = await page.screenshot({ fullPage: true })
await browser.close()
const image = sharp(buffer)
const meta = await image.metadata()
await (preview ? image.resize(Number(preview)) : image).toFile(out)
console.log(`${out} ${meta.width}x${meta.height}`)
