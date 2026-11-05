import { chromium } from "@playwright/test"

const base = "http://localhost:3100"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [slug, size] of [["asics-gel-kayano-30-black-silver", "44"], ["hoka-bondi-7-blue-2", "40"]]) {
  await page.goto(`${base}/products/${slug}`, { waitUntil: "networkidle" })
  const radio = page.getByRole("radio", { name: new RegExp(`\\b${size}\\b`) })
  if (await radio.count()) await radio.first().check({ force: true })
  const added = page.waitForResponse((r) => r.url().endsWith("/api/cart") && r.request().method() === "POST")
  await page.getByRole("button", { name: "Add to cart", exact: true }).click()
  await added
}
await page.goto(`${base}/cart`, { waitUntil: "networkidle" })
const selectors = process.argv.slice(2)
for (const selector of selectors) {
  const rows = await page.$$eval(selector, (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return `${el.tagName} ${(el.textContent || "").trim().slice(0, 22).padEnd(22)} x=${r.x} y=${r.y} w=${r.width} h=${r.height}`
    }),
  )
  console.log(`# ${selector}\n${rows.join("\n")}`)
}
if (process.env.FLOW) {
  // Quantity +1, then remove the first line; report focus and live-region text.
  const patched = page.waitForResponse((r) => r.request().method() === "PATCH", { timeout: 10000 }).catch(() => null)
  await page.getByRole("button", { name: "Increase quantity" }).first().click()
  const patch = await patched
  console.log("PATCH", patch ? `${patch.status()} ${(await patch.text()).slice(0, 300)}` : "none")
  await page.waitForTimeout(800)
  console.log("alert:", await page.locator("[role=alert]").allTextContents())
  console.log("after +1:", await page.locator("[role=group] output").first().textContent(), "|", await page.locator("[role=status]").last().textContent())
  await page.getByRole("button", { name: /^Remove / }).first().click()
  await page.waitForTimeout(800)
  console.log("after remove: lines", await page.locator("main li").count(), "| focus", await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)), "|", await page.locator("[role=status]").last().textContent())
  await page.getByRole("button", { name: /^Remove / }).first().click()
  await page.waitForTimeout(800)
  console.log("after remove all: h1", await page.locator("h1").textContent(), "| focus", await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)))
}
await browser.close()
