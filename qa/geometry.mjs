#!/usr/bin/env node
/**
 * Geometry audit: every visible TEXT node of each designed screen (design/spec/geometry/*.json,
 * exported from Figma) is matched to the rendered text run with the same characters, and its
 * position is compared at 0.01 px: left edge (dx), top (AUTO line height) or vertical centre (fixed
 * line height) as dy, and, for single-line text, advance width (dw, against Figma's whole-pixel box).
 *
 * Usage: node qa/geometry.mjs [--base=http://127.0.0.1:3200] [--browser=chromium|firefox|webkit] [ids...]
 * Writes qa/out/geometry.json; exits 1 if any matched node is off by more than 0.01 px.
 */
import { chromium, firefox, webkit } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
const base = args.find((arg) => arg.startsWith("--base="))?.slice(7) ?? "http://127.0.0.1:3200"
const engine = { chromium, firefox, webkit }[args.find((arg) => arg.startsWith("--browser="))?.slice(10) ?? "chromium"]
const only = args.filter((arg) => !arg.startsWith("--"))
const map = JSON.parse(fs.readFileSync("qa/screens.map.json", "utf8"))
const TOLERANCE = 0.01

const normalise = (text) => text.replace(/\s+/g, " ").trim().toLowerCase()

/** Visible TEXT nodes with frame-relative boxes. */
function designTexts(file) {
  const root = JSON.parse(fs.readFileSync(file, "utf8")).node
  const out = []
  const walk = (node) => {
    if (node.visible === false || node.opacity === 0) return
    if (node.type === "TEXT" && node.characters?.trim()) {
      out.push({
        id: node.id,
        text: normalise(node.characters),
        x: node.absX - root.absX,
        cy: node.absY - root.absY + node.height / 2,
        top: node.absY - root.absY,
        // Figma's AUTO line height is the font's own ascent + descent, the same box the browser's
        // range rect reports, so tops compare directly; fixed line heights compare by centre.
        autoLineHeight: node.lineHeight?.unit === "AUTO",
        // A 0 px line height collapses the box to the baseline area, so its centre says nothing.
        hasHeight: node.height > 0,
        width: node.width,
        singleLine: !node.characters.includes("\n") && node.height < (node.fontSize ?? 16) * 1.7,
      })
    }
    for (const child of node.children ?? []) walk(child)
  }
  walk(root)
  return out
}

/** Runs in the page: every rendered text node's union box, keyed by its displayed text. */
function appTexts() {
  const out = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement
    if (!node.textContent.trim() || !element || element.closest("[aria-hidden=true] svg, script, style, .sr-only")) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    const rect = range.getBoundingClientRect()
    if (!rect.width || !rect.height) continue
    // The browser adds letter-spacing after the last glyph too; Figma's box stops at the last advance.
    const trailing = Number.parseFloat(getComputedStyle(element).letterSpacing) || 0
    out.push({ text: node.textContent, x: rect.left + window.scrollX, top: rect.top + window.scrollY, cy: rect.top + window.scrollY + rect.height / 2, width: rect.width - trailing, lines: range.getClientRects().length })
  }
  return out
}

async function runSetup(page, setup) {
  for (const item of setup?.addToCart ?? []) {
    await page.goto(`${base}/products/${item.slug}`, { waitUntil: "networkidle" })
    const size = page.getByRole("radio", { name: new RegExp(`\\b${item.size}\\b`) })
    if (await size.count()) await size.first().check({ force: true })
    for (let step = 1; step < (item.quantity ?? 1); step += 1) await page.getByRole("button", { name: "Increase quantity" }).click()
    const added = page.waitForResponse((response) => response.url().endsWith("/api/cart") && response.request().method() === "POST")
    await page.getByRole("button", { name: "Add to cart", exact: true }).click()
    await added
  }
}

const browser = await engine.launch()
const report = []
let failures = 0
for (const screen of map.screens) {
  if (only.length && !only.includes(screen.id)) continue
  const specFile = path.join("design/spec/geometry", path.basename(screen.design).replace(/\.png$/, ".json"))
  const expected = designTexts(specFile)
  const context = await browser.newContext({ viewport: { width: map.viewport.width, height: 1080 }, reducedMotion: "reduce", deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(base + "/", { waitUntil: "domcontentloaded" })
  await runSetup(page, screen.setup)
  await page.goto(base + screen.route, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  const actual = (await page.evaluate(appTexts)).map((item) => ({ ...item, key: normalise(item.text) }))
  await context.close()

  // Repeated texts (prices, chips, footer links) pair up in reading order when both sides have the
  // same count; nearest-distance pairing would cross-match neighbouring cards. Otherwise nearest wins.
  const byKey = (list) => list.reduce((groups, item, index) => groups.set(item.key ?? item.text, [...(groups.get(item.key ?? item.text) ?? []), index]), new Map())
  const readingOrder = (list) => (a, b) => list[a].cy - list[b].cy || list[a].x - list[b].x
  const expectedGroups = byKey(expected)
  const actualGroups = byKey(actual)
  const paired = new Map()
  for (const [key, indices] of expectedGroups) {
    const candidates = actualGroups.get(key) ?? []
    if (indices.length < 2 || indices.length !== candidates.length) continue
    const designOrder = [...indices].sort(readingOrder(expected))
    const appOrder = [...candidates].sort(readingOrder(actual))
    designOrder.forEach((designIndex, position) => paired.set(designIndex, appOrder[position]))
  }

  const used = new Set(paired.values())
  const rows = []
  for (const [nodeIndex, node] of expected.entries()) {
    let best = paired.has(nodeIndex) ? { index: paired.get(nodeIndex), item: actual[paired.get(nodeIndex)] } : null
    if (!best) {
      actual.forEach((item, index) => {
        if (used.has(index) || item.key !== node.text) return
        const distance = Math.hypot(item.x - node.x, item.cy - node.cy)
        if (!best || distance < best.distance) best = { index, item, distance }
      })
    }
    if (!best) {
      rows.push({ id: node.id, text: node.text.slice(0, 40), matched: false })
      continue
    }
    used.add(best.index)
    const dx = best.item.x - node.x
    const dy = !node.hasHeight ? 0 : node.autoLineHeight ? best.item.top - node.top : best.item.cy - node.cy
    const rawDw = node.singleLine && best.item.lines === 1 ? best.item.width - node.width : null
    // Figma stores an auto-width text box as its advance rounded up to a whole pixel (Men 41.44 → 42),
    // so a whole-pixel design width is met when the rendered advance rounds up to it.
    const dw = rawDw === null ? null : Number.isInteger(node.width) && Math.ceil(best.item.width - TOLERANCE) === node.width ? 0 : rawDw
    const worst = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw ?? 0))
    rows.push({ id: node.id, text: node.text.slice(0, 40), matched: true, dx: +dx.toFixed(2), dy: +dy.toFixed(2), dw: dw === null ? null : +dw.toFixed(2), rawDw: rawDw === null ? null : +rawDw.toFixed(2), worst: +worst.toFixed(2) })
  }
  const matched = rows.filter((row) => row.matched)
  const buckets = {
    exact: matched.filter((row) => row.worst <= TOLERANCE).length,
    "≤0.5": matched.filter((row) => row.worst > TOLERANCE && row.worst <= 0.5).length,
    "≤2": matched.filter((row) => row.worst > 0.5 && row.worst <= 2).length,
    ">2": matched.filter((row) => row.worst > 2).length,
  }
  failures += matched.length - buckets.exact
  const worst = [...matched].sort((a, b) => b.worst - a.worst).slice(0, 8)
  report.push({ id: screen.id, route: screen.route, designTexts: expected.length, matched: matched.length, unmatched: rows.filter((row) => !row.matched), buckets, worst, rows })
  console.log(
    `${screen.id} ${screen.route.padEnd(44)} texts ${String(expected.length).padStart(3)} · matched ${String(matched.length).padStart(3)} · exact ${buckets.exact} · ≤0.5 ${buckets["≤0.5"]} · ≤2 ${buckets["≤2"]} · >2 ${buckets[">2"]}`,
  )
  for (const row of worst.filter((item) => item.worst > 2)) console.log(`     ${row.text.padEnd(40)} dx=${row.dx} dy=${row.dy} dw=${row.dw}`)
}
await browser.close()
fs.mkdirSync("qa/out", { recursive: true })
fs.writeFileSync("qa/out/geometry.json", JSON.stringify({ generatedAt: new Date().toISOString(), base, tolerance: TOLERANCE, report }, null, 2))
process.exit(failures ? 1 : 0)
