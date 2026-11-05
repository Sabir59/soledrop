import { chromium } from "@playwright/test"

const browser = await chromium.launch()
for (const [width, height, name, tab] of [
  [1440, 900, "desktop", ""],
  [1920, 1080, "wide", ""],
  [390, 844, "mobile", "?tab=preloved"],
]) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(`http://localhost:3200/new-arrivals${tab}`, { waitUntil: "load" })
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForFunction(() => [...document.querySelectorAll("main img")].filter((img) => img.checkVisibility()).every((img) => img.complete))
  await page.locator("main").screenshot({ path: `.qa-tmp/arrivals-${name}.png` })
  await page.close()
}
await browser.close()
