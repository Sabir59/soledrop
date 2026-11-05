import { chromium } from "@playwright/test"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" })
await page.goto("http://localhost:3200/", { waitUntil: "load" })
await page.waitForTimeout(1500)
console.log(
  JSON.stringify(
    await page.evaluate(() => {
      const track = document.querySelector("[aria-roledescription=carousel] [aria-live]")
      const escaped = [...track.querySelectorAll("*")]
        .filter((n) => ["absolute", "fixed"].includes(getComputedStyle(n).position) && !(n.offsetParent && track.contains(n.offsetParent)))
        .map((n) => `${n.tagName}.${String(n.className).slice(0, 60)} parent=${n.offsetParent?.tagName}.${String(n.offsetParent?.className).slice(0, 40)}`)
      return { doc: document.documentElement.scrollWidth, trackStyle: getComputedStyle(track).overflowX, trackPos: getComputedStyle(track).position, escaped: escaped.slice(0, 8) }
    }),
    null,
    1,
  ),
)
await browser.close()
