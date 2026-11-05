import { chromium } from "@playwright/test"

const base = "http://localhost:3200"
for (let i = 0; i < 60; i++) {
  const ok = await fetch(base + "/api/health").then((r) => r.ok).catch(() => false)
  if (ok) break
  await new Promise((r) => setTimeout(r, 1000))
}
const browser = await chromium.launch()
for (const [path, width, height] of [["/pre-loved", 1440, 1500], ["/collections/men", 1440, 1500], ["/pre-loved", 390, 1600], ["/pre-loved", 1920, 1800]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" })
  await page.goto(base + path, { waitUntil: "load" })
  await page.waitForTimeout(800)
  const name = `.qa-tmp/pl-${path.split("/").pop()}-${width}.png`
  await page.screenshot({ path: name })
  const metrics = await page.evaluate(() => {
    const banner = document.querySelector("main h1")?.closest("section, div")?.getBoundingClientRect()
    const toolbar = [...document.querySelectorAll("button, [role=combobox]")].find((n) => /featured|sort/i.test(n.textContent ?? ""))?.getBoundingClientRect()
    return { guide: !!document.getElementById("condition-guide"), bannerBottom: banner?.bottom, toolbarTop: toolbar?.top, scroll: document.documentElement.scrollWidth }
  })
  console.log(name, JSON.stringify(metrics))
  await page.close()
}
await browser.close()
