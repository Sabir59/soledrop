import { chromium } from "@playwright/test"

const base = "http://localhost:3200"
for (let i = 0; i < 60; i++) {
  const ok = await fetch(base + "/api/health").then((r) => r.ok).catch(() => false)
  if (ok) break
  await new Promise((r) => setTimeout(r, 1000))
}
const browser = await chromium.launch()
for (const [width, height] of [[1440, 1100], [390, 1700]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" })
  await page.goto(base + "/", { waitUntil: "load" })
  await page.waitForFunction(() => Object.keys(document.querySelector("header") ?? {}).some((key) => key.startsWith("__reactFiber")))
  const section = page.locator("section[aria-roledescription=carousel]")
  await section.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => {
    const image = document.querySelector("[aria-roledescription=slide] img")
    return image?.complete && image.naturalWidth > 0
  })
  await page.waitForTimeout(2000)
  await section.screenshot({ path: `.qa-tmp/featured-${width}-1.png` })
  await section.getByRole("link", { name: "Pre-Loved" }).click()
  await page.waitForTimeout(1200)
  await section.screenshot({ path: `.qa-tmp/featured-${width}-2.png` })
  const state = await section.evaluate((node) => ({
    current: [...node.querySelectorAll("[aria-current]")].map((a) => a.textContent),
    inert: [...node.querySelectorAll("[aria-roledescription=slide]")].map((s) => s.inert),
    scroll: document.documentElement.scrollWidth,
  }))
  console.log(width, JSON.stringify(state))
  await page.close()
}
await browser.close()
