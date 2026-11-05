import { chromium } from "@playwright/test"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" })
await page.goto("http://localhost:3200/", { waitUntil: "load" })
const section = page.locator("section[aria-labelledby='instagram-title']")
await section.scrollIntoViewIfNeeded()
await page.waitForFunction(() => [...document.querySelectorAll("section[aria-labelledby='instagram-title'] img")].every((img) => img.complete && img.naturalWidth > 0))
await section.locator("li a").nth(1).hover()
await page.waitForTimeout(700)
await section.screenshot({ path: ".qa-tmp/insta-hover.png" })
await browser.close()
