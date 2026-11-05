import { chromium } from "@playwright/test"

const browser = await chromium.launch()
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "no-preference" })
  await page.goto("http://localhost:3200/", { waitUntil: "load" })
  const section = page.locator("section[aria-labelledby='brands-title']")
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  await section.screenshot({ path: `.qa-tmp/brands-${width}.png` })
  await browser.contexts()[0]?.close()
}
await browser.close()
