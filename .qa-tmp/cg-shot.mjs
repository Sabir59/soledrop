import { chromium } from "@playwright/test"

const base = "http://localhost:3200"
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(base + "/api/health")).ok) break
  } catch {}
  await new Promise((r) => setTimeout(r, 1000))
}
const browser = await chromium.launch()
for (const [name, width] of [["desktop", 1440], ["mobile", 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto(base + "/condition-guide")
  await page.waitForTimeout(1500)
  await page.getByRole("button", { name: "Pause the guide" }).click()
  await page.getByRole("tab").nth(2).click()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(600)
  await page.screenshot({ path: ".qa-tmp/cg-" + name + ".png", fullPage: true })
  await page.close()
}
const footer = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await footer.goto(base + "/faq")
await footer.getByRole("contentinfo").screenshot({ path: ".qa-tmp/cg-footer.png" })
await browser.close()
