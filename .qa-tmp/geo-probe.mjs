// Probe: design TEXT nodes vs rendered text in a frame-relative rectangle, with font data.
// Usage: node .qa-tmp/geo-probe.mjs <screenId> <x0> <y0> <x1> <y1> [setupScreenId]
import { chromium } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const [id, x0, y0, x1, y1] = process.argv.slice(2)
const box = [x0, y0, x1, y1].map(Number)
const textFilter = process.env.TEXT ? new RegExp(process.env.TEXT, "i") : null
const inBox = (x, y, text) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && (!textFilter || text === undefined || textFilter.test(text))
const base = process.env.QA_BASE_URL ?? "http://127.0.0.1:3200"
const map = JSON.parse(fs.readFileSync("qa/screens.map.json", "utf8"))
const screen = map.screens.find((item) => item.id === id)
const root = JSON.parse(fs.readFileSync(path.join("design/spec/geometry", path.basename(screen.design).replace(/\.png$/, ".json")), "utf8")).node

console.log("DESIGN")
const walk = (node) => {
  if (node.visible === false) return
  const x = node.absX - root.absX
  const y = node.absY - root.absY
  if (node.type === "TEXT" && inBox(x, y, node.characters)) {
    console.log(`  ${x.toFixed(2).padStart(8)} ${y.toFixed(2).padStart(8)} w${node.width.toFixed(2).padStart(7)} h${node.height.toFixed(2).padStart(6)} ${node.fontSize}px ${node.fontName?.style} ls=${JSON.stringify(node.letterSpacing)} lh=${JSON.stringify(node.lineHeight)} "${node.characters.slice(0, 40)}"`)
  } else if (node.type !== "TEXT" && inBox(x, y) && process.env.SHAPES) {
    console.log(`  [${node.type} ${node.name}] ${x.toFixed(2)} ${y.toFixed(2)} ${node.width.toFixed(2)}x${node.height.toFixed(2)}`)
  }
  for (const child of node.children ?? []) walk(child)
}
walk(root)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: map.viewport.width, height: 1080 } })
for (const item of screen.setup?.addToCart ?? []) {
  await page.goto(`${base}/products/${item.slug}`, { waitUntil: "networkidle" })
  const size = page.getByRole("radio", { name: new RegExp(`\\b${item.size}\\b`) })
  if (await size.count()) await size.first().check({ force: true })
  const added = page.waitForResponse((response) => response.url().endsWith("/api/cart") && response.request().method() === "POST")
  await page.getByRole("button", { name: "Add to cart", exact: true }).click()
  await added
}
await page.goto(base + screen.route, { waitUntil: "networkidle" })
await page.evaluate(() => document.fonts.ready)
const rows = await page.evaluate(() => {
  const out = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement
    if (!node.textContent.trim() || element.closest(".sr-only, script, style")) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    const rect = range.getBoundingClientRect()
    if (!rect.width) continue
    const style = getComputedStyle(element)
    out.push({ x: rect.left + scrollX, y: rect.top + scrollY, w: rect.width, h: rect.height, text: node.textContent.trim().slice(0, 40), font: `${style.fontSize} ${style.fontWeight} ls=${style.letterSpacing} lh=${style.lineHeight}`, tag: element.tagName.toLowerCase(), cls: element.className.toString().slice(0, 90) })
  }
  return out
})
console.log("APP")
for (const row of rows.filter((item) => inBox(item.x, item.y, item.text))) {
  console.log(`  ${row.x.toFixed(2).padStart(8)} ${row.y.toFixed(2).padStart(8)} w${row.w.toFixed(2).padStart(7)} h${row.h.toFixed(2).padStart(6)} ${row.font} <${row.tag}> "${row.text}" ${process.env.CLS ? row.cls : ""}`)
}
await browser.close()
