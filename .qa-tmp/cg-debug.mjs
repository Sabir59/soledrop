import { chromium } from "@playwright/test"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto("http://localhost:3200/condition-guide")
await page.waitForTimeout(1500)
const info = () =>
  page.evaluate(() => {
    const bar = document.querySelector(".animate-grade-progress")
    if (!bar) return "no bar"
    const style = getComputedStyle(bar)
    return { name: style.animationName, state: style.animationPlayState, transform: style.transform, classes: bar.className, anims: bar.getAnimations().map((a) => [a.playState, a.currentTime]) }
  })
console.log(await info())
await page.waitForTimeout(3000)
console.log(await info())
await page.waitForTimeout(3000)
console.log(await info())
console.log(await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].map((t) => t.getAttribute("aria-selected")).join(",")))
await browser.close()
