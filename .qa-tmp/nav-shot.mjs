import { chromium } from "@playwright/test"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 400 }, reducedMotion: "reduce" })
await page.goto("http://localhost:3200/collections/men", { waitUntil: "load" })
await page.waitForFunction(() => Object.keys(document.querySelector("header") ?? {}).some((key) => key.startsWith("__reactFiber")))
const men = page.locator("header").first().getByRole("button", { name: "Men", exact: true })
await men.click()
await page.waitForTimeout(400)
console.log("url after click:", page.url(), "expanded:", await men.getAttribute("aria-expanded"))
await page.screenshot({ path: ".qa-tmp/nav-click.png", clip: { x: 300, y: 0, width: 900, height: 260 } })
await browser.close()
