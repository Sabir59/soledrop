import { chromium } from "@playwright/test"

const base = "http://localhost:3100"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errors = []
page.on("pageerror", (error) => errors.push(error.message))

await page.goto(base + "/products/hoka-bondi-7-grey", { waitUntil: "networkidle" })
await page.getByRole("button", { name: /Excellent/ }).click()
const dialog = page.getByRole("dialog")
console.log("dialog open:", await dialog.isVisible(), "| title:", await dialog.getByRole("heading").textContent())
await page.screenshot({ path: ".qa-tmp/dialog.png" })
await page.keyboard.press("Escape")
console.log("dialog closed by Esc:", !(await dialog.isVisible()))

await page.getByRole("button", { name: "Description" }).click().catch(() => null)
await page.locator("summary", { hasText: "Condition" }).click()
console.log("condition panel:", (await page.locator("details[open]").textContent()).slice(0, 80))

await page.goto(base + "/products/asics-gel-kayano-30-black-silver", { waitUntil: "networkidle" })
await page.getByRole("button", { name: "Add to cart" }).first().click()
console.log("no size:", await page.getByRole("status").filter({ hasText: /size/i }).first().textContent())
await page.locator("label", { hasText: "42" }).first().click()
await page.getByRole("button", { name: "Increase quantity" }).click()
await page.getByRole("button", { name: "Add to cart" }).first().click()
await page.getByText(/Added 2/).waitFor({ timeout: 10000 })
console.log("added:", await page.getByText(/Added 2/).textContent())
await page.locator("ul[aria-label$='photos'] button").nth(3).click()
console.log("main image after thumb 4:", await page.locator("main img").first().getAttribute("alt"))
await page.getByRole("button", { name: "Buy now" }).click()
await page.waitForURL(/checkout/, { timeout: 15000 }).catch(() => null)
console.log("after buy now:", page.url())
console.log("errors:", errors)
await browser.close()
