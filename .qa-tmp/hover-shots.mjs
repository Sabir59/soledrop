import { chromium } from "@playwright/test"

const base = "http://localhost:3200"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })
const shots = [
  ["/", (p) => p.getByRole("link", { name: "New shoes" }), "hero"],
  ["/", (p) => p.getByRole("button", { name: "Add to cart", exact: true }).first(), "featured"],
  ["/", (p) => p.getByRole("button", { name: /join now/i }), "newsletter"],
  ["/faq", (p) => p.getByRole("contentinfo").getByRole("link", { name: "SHOP NOW" }), "promo"],
]
for (const [route, find, name] of shots) {
  await page.goto(base + route, { waitUntil: "load" })
  await page.waitForTimeout(800)
  const target = find(page)
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  const clip = { x: Math.max(0, box.x - 120), y: Math.max(0, box.y - 60), width: box.width + 240, height: box.height + 120 }
  await page.mouse.move(5, 5)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `.qa-tmp/hover-${name}-0.png`, clip })
  await target.hover()
  await page.waitForTimeout(250)
  await page.screenshot({ path: `.qa-tmp/hover-${name}-1.png`, clip })
}
await browser.close()
