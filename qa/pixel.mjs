#!/usr/bin/env node
/**
 * Pixel QA: renders every designed screen at 1920 px and compares it with the design PNG using
 * pixelmatch at threshold 0 (anti-aliased pixels excluded, nothing else). Writes
 * qa/out/<id>/{design,app,diff}.png, qa/out/results.json and qa/out/index.html.
 *
 * Usage: node qa/pixel.mjs [--base=http://localhost:3000] [ids...]      (QA_BASE_URL defaults to http://localhost:3000 — run
 *        against `next build && next start`, not the dev server)
 */
import { chromium } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"

const args = process.argv.slice(2)
const base = args.find((arg) => arg.startsWith("--base="))?.slice(7) ?? process.env.QA_BASE_URL ?? "http://localhost:3000"
const map = JSON.parse(fs.readFileSync("qa/screens.map.json", "utf8"))
const only = args.filter((arg) => !arg.startsWith("--"))
const OUT = "qa/out"
fs.mkdirSync(OUT, { recursive: true })

async function settle(page) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    window.scrollTo(0, 0)
    // Only rendered images: lazy images inside closed (hidden) header panels never load.
    await Promise.all(
      [...document.images]
        .filter((image) => image.getClientRects().length > 0)
        .map((image) => (image.complete ? null : new Promise((resolve) => ["load", "error"].forEach((type) => image.addEventListener(type, resolve, { once: true }))))),
    )
  })
  await page.waitForTimeout(400)
}

/** Fills the bag through the product page UI, as a shopper would: pick the size, set the quantity, Add to cart. */
async function runSetup(page, setup) {
  for (const item of setup?.addToCart ?? []) {
    await page.goto(`${base}/products/${item.slug}`, { waitUntil: "networkidle" })
    const size = page.getByRole("radio", { name: new RegExp(`\\b${item.size}\\b`) })
    if (await size.count()) await size.first().check({ force: true })
    for (let step = 1; step < (item.quantity ?? 1); step += 1) await page.getByRole("button", { name: "Increase quantity" }).click()
    const added = page.waitForResponse((response) => response.url().endsWith("/api/cart") && response.request().method() === "POST")
    await page.getByRole("button", { name: "Add to cart", exact: true }).click()
    const response = await added
    if (!response.ok()) throw new Error(`setup: add to cart failed for ${item.slug} EU ${item.size} (${response.status()})`)
  }
}

/**
 * Runs in the page: document-space boxes of raster images (next/image re-encodes photos, so their
 * pixels can never equal the design PNG) and of every rendered text run (glyph rasterisation).
 */
function collectRegions() {
  const box = (rect) => [rect.left + window.scrollX, rect.top + window.scrollY, rect.right + window.scrollX, rect.bottom + window.scrollY]
  const visible = (rect) => rect.width > 0 && rect.height > 0
  const photos = [...document.querySelectorAll("img")].map((image) => image.getBoundingClientRect()).filter(visible).map(box)
  const glyphs = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    for (const rect of range.getClientRects()) if (visible(rect)) glyphs.push(box(rect))
  }
  return { photos, glyphs }
}

/** Counts pixelmatch's red (non-AA) diff pixels by region; a 1 px halo absorbs edge rounding. */
function classify(diff, { photos, glyphs }) {
  const paint = (boxes) => {
    const mask = new Uint8Array(diff.width * diff.height)
    for (const [x0, y0, x1, y1] of boxes) {
      for (let y = Math.max(0, Math.floor(y0) - 1); y < Math.min(diff.height, Math.ceil(y1) + 1); y += 1) {
        mask.fill(1, y * diff.width + Math.max(0, Math.floor(x0) - 1), y * diff.width + Math.min(diff.width, Math.ceil(x1) + 1))
      }
    }
    return mask
  }
  const photoMask = paint(photos)
  const glyphMask = paint(glyphs)
  const counts = { photo: 0, glyph: 0, other: 0 }
  for (let index = 0; index < diff.width * diff.height; index += 1) {
    const offset = index * 4
    const red = diff.data[offset] === 255 && diff.data[offset + 1] === 0 && diff.data[offset + 2] === 0
    if (!red) continue
    if (photoMask[index]) counts.photo += 1
    else if (glyphMask[index]) counts.glyph += 1
    else counts.other += 1
  }
  return counts
}

// Figma rasterises text unhinted with greyscale antialiasing; match that renderer instead of
// Windows' LCD (coloured subpixel) text and hinting, which no design pixel can equal.
const browser = await chromium.launch({ args: ["--disable-lcd-text", "--font-render-hinting=none"] })
const results = []
for (const screen of map.screens) {
  if (only.length && !only.includes(screen.id)) continue
  const design = PNG.sync.read(fs.readFileSync(screen.design))
  const context = await browser.newContext({ viewport: { width: map.viewport.width, height: 1080 }, reducedMotion: "reduce", deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(base + "/", { waitUntil: "domcontentloaded" })
  await runSetup(page, screen.setup)
  await page.goto(base + screen.route, { waitUntil: "networkidle" })
  await settle(page)
  const regions = await page.evaluate(collectRegions)
  const appBuffer = await page.screenshot({ fullPage: true })
  await context.close()

  const app = PNG.sync.read(appBuffer)
  const width = design.width
  const height = Math.max(design.height, app.height)
  const pad = (png) => {
    const out = new PNG({ width, height })
    out.data.fill(0)
    PNG.bitblt(png, out, 0, 0, Math.min(png.width, width), Math.min(png.height, height), 0, 0)
    return out
  }
  const a = pad(design)
  const b = pad(app)
  const diff = new PNG({ width, height })
  const mismatched = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0, includeAA: false })
  const classes = classify(diff, regions)
  const dir = path.join(OUT, screen.id)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "design.png"), PNG.sync.write(a))
  fs.writeFileSync(path.join(dir, "app.png"), PNG.sync.write(b))
  fs.writeFileSync(path.join(dir, "diff.png"), PNG.sync.write(diff))
  const result = {
    id: screen.id,
    route: screen.route,
    designSize: [design.width, design.height],
    appSize: [app.width, app.height],
    heightDelta: app.height - design.height,
    mismatched,
    ratio: Number((mismatched / (width * height)).toFixed(6)),
    // Diagnostic only (the gate is `pass`): where the mismatched pixels fall, from the DOM at capture time.
    classes,
    pass: mismatched === 0 && app.height === design.height,
  }
  results.push(result)
  console.log(
    `${screen.id} ${screen.route.padEnd(48)} Δh=${String(result.heightDelta).padStart(5)} mismatched=${mismatched} (${(result.ratio * 100).toFixed(3)} %)` +
      ` · photo ${classes.photo} · glyph ${classes.glyph} · other ${classes.other}`,
  )
}
await browser.close()

fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ generatedAt: new Date().toISOString(), base, threshold: 0, includeAA: false, results }, null, 2))
const rows = results
  .map(
    (r) => `<tr><td>${r.id}</td><td>${r.route}</td><td>${r.heightDelta}</td><td>${r.mismatched}</td><td>${(r.ratio * 100).toFixed(3)} %</td><td>${r.pass ? "pass" : "fail"}</td>
<td><a href="${r.id}/design.png">design</a> · <a href="${r.id}/app.png">app</a> · <a href="${r.id}/diff.png">diff</a></td></tr>`,
  )
  .join("\n")
fs.writeFileSync(
  path.join(OUT, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Pixel QA</title><style>body{font:14px system-ui;margin:2rem}td,th{padding:.4rem .8rem;border-bottom:1px solid #ddd;text-align:start}</style>
<h1>Pixel QA — threshold 0, AA excluded</h1><table><tr><th>Screen</th><th>Route</th><th>Δ height</th><th>Mismatched px</th><th>Ratio</th><th>Result</th><th>Images</th></tr>${rows}</table>`,
)
