import { chromium } from "@playwright/test"

const base = process.env.QA_BASE_URL ?? "http://localhost:3100"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
page.on("pageerror", (error) => console.log("PAGEERROR", error.message))
page.on("console", (message) => message.type() === "error" && console.log("CONSOLE", message.text().slice(0, 200)))

await page.goto(`${base}/products/asics-gel-kayano-30-black-silver`, { waitUntil: "networkidle" })
await page.getByRole("radio", { name: /\b44\b/ }).first().check({ force: true })
const added = page.waitForResponse((r) => r.url().endsWith("/api/cart") && r.request().method() === "POST")
await page.getByRole("button", { name: "Add to cart", exact: true }).click()
await added

await page.goto(`${base}/checkout`, { waitUntil: "networkidle" })
await page.getByRole("radio", { name: /Standard delivery/ }).waitFor()
await page.screenshot({ path: ".qa-tmp/checkout-1920.png", fullPage: true })

// Empty submit: errors and focus on the first invalid field.
await page.getByRole("button", { name: /^Place order/ }).click()
console.log("focus after empty submit:", await page.evaluate(() => document.activeElement?.getAttribute("name")))
console.log("errors:", (await page.locator("main p.text-destructive").allTextContents()).join(" | "))

// Promotion code: an unknown code, then a real one.
await page.getByLabel("Promotion code").fill("NOPE")
await page.getByRole("button", { name: "Apply" }).click()
await page.waitForTimeout(1200)
console.log("bad code:", await page.locator("[role=status]").filter({ hasText: /./ }).allTextContents())
await page.getByLabel("Promotion code").fill("welcome10")
await page.getByRole("button", { name: "Apply" }).click()
await page.waitForTimeout(1500)
console.log("summary:", (await page.locator("#checkout-summary-title").locator("..").locator("dl").innerText()).replace(/\n/g, " / "))

await page.getByLabel("Email").fill(`qa.${Date.now()}@example.com`)
await page.getByLabel("Full name").fill("Ayesha Khan")
await page.getByLabel("Mobile number").fill("0300 1234567")
await page.getByLabel("House and street").fill("House 12, Street 4, F-7/2")
await page.getByLabel("City").fill("Islamabad")
await page.getByLabel("Province").selectOption("Islamabad Capital Territory")
await page.getByLabel("City").focus()
await page.getByLabel("Gift note (optional)").fill("Happy birthday!")
await page.getByRole("radio", { name: /Cash on delivery/ }).check()
await page.waitForTimeout(1200)
const placed = page.waitForResponse((r) => r.url().endsWith("/api/checkout") && r.request().method() === "POST")
await page.getByRole("button", { name: /^Place order/ }).click()
const response = await placed
console.log("place:", response.status(), (await response.text()).slice(0, 200))
await page.waitForURL(/\/orders\/SD/, { timeout: 20000 })
await page.waitForLoadState("networkidle")
console.log("order url:", page.url().replace(/token=[^&]+/, "token=…"))
console.log("h1:", await page.locator("h1").textContent())
await page.screenshot({ path: ".qa-tmp/order-1920.png", fullPage: true })

// Cancel flow.
await page.getByRole("button", { name: "Cancel order" }).click()
console.log("confirm focus:", await page.evaluate(() => document.activeElement?.textContent))
const cancelled = page.waitForResponse((r) => r.url().includes("/cancel"))
await page.getByRole("button", { name: "Yes, cancel" }).click()
const cancelResponse = await cancelled
console.log("cancel:", cancelResponse.status(), (await cancelResponse.text()).slice(0, 160))
await page.waitForTimeout(2500)
console.log("status/alert:", await page.locator("[role=status],[role=alert]").filter({ hasText: /./ }).allTextContents())
console.log("after cancel:", await page.locator("#order-progress").locator("..").innerText().then((t) => t.slice(0, 120).replace(/\n/g, " / ")))

// Bag is empty after the order; checkout redirects to the bag.
await page.goto(`${base}/checkout`, { waitUntil: "networkidle" })
console.log("checkout with empty bag →", page.url())

// Mobile.
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto(`${base}/products/asics-gel-kayano-30-black-silver`, { waitUntil: "networkidle" })
await mobile.getByRole("radio", { name: /\b44\b/ }).first().check({ force: true })
const added2 = mobile.waitForResponse((r) => r.url().endsWith("/api/cart") && r.request().method() === "POST")
await mobile.getByRole("button", { name: "Add to cart", exact: true }).click()
await added2
await mobile.goto(`${base}/checkout`, { waitUntil: "networkidle" })
await mobile.getByRole("radio", { name: /Standard delivery/ }).waitFor()
console.log("mobile overflow:", await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
await mobile.screenshot({ path: ".qa-tmp/checkout-390.png", fullPage: true })

await page.goto(`${base}/orders/lookup`, { waitUntil: "networkidle" })
await page.getByRole("button", { name: "Find my order" }).click()
console.log("lookup errors:", (await page.locator("main p.text-destructive").allTextContents()).join(" | "))
await page.getByLabel("Order number").fill("SD99999")
await page.getByLabel("Email used at checkout").fill("qa.shopper@example.com")
await page.getByRole("button", { name: "Find my order" }).click()
await page.waitForTimeout(1500)
console.log("lookup miss:", await page.locator("[role=alert]").filter({ hasText: /./ }).allTextContents())
await browser.close()
