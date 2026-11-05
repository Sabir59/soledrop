import { chromium } from "@playwright/test"

const [route = "", width = "390"] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } })
await page.goto("http://localhost:3100/" + route, { waitUntil: "networkidle" })
const rows = await page.evaluate((limit) => {
  const out = []
  for (const element of document.querySelectorAll("body *")) {
    const box = element.getBoundingClientRect()
    if (box.right > limit + 1 && box.width > 0) {
      const parent = element.parentElement?.getBoundingClientRect()
      if (!parent || parent.right <= limit + 1) out.push(`${element.tagName.toLowerCase()}.${String(element.className).slice(0, 120)} right=${box.right.toFixed(0)} w=${box.width.toFixed(0)}`)
    }
  }
  return out
}, Number(width))
console.log(rows.join("\n") || "no overflow")
await browser.close()
