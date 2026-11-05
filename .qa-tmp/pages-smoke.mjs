import { chromium } from "@playwright/test"

const base = process.env.QA_BASE_URL ?? "http://localhost:3100"
const browser = await chromium.launch()
const shots = process.env.SHOTS === "1"

for (const width of [1920, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => message.type() === "error" && errors.push(message.text().slice(0, 200)))
  for (const path of ["/pages/shipping", "/pages/about", "/search?q=nike", "/search", "/account/login", "/account/register", "/account/forgot-password", "/account/reset-password", "/orders/lookup", "/newsletter/unsubscribe?email=a%40b.co&token=xxxxxxxxxxxx", "/does-not-exist", "/pages/nope", "/orders/SD10001"]) {
    const response = await page.goto(base + path, { waitUntil: "networkidle" })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    const h1 = await page.locator("h1").allTextContents()
    console.log(width, response.status(), path, "| h1:", h1.join(" / ").slice(0, 60), "| overflow:", overflow)
    if (shots && width === 1920) await page.screenshot({ path: `.qa-tmp/smoke-${path.replace(/[^a-z0-9]+/gi, "_")}.png`, fullPage: true })
  }
  if (errors.length) console.log("page errors:", errors)
  await page.close()
}

// Register → account → sign out → sign in.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const email = `qa.${Date.now()}@example.com`
await page.goto(`${base}/account/register`, { waitUntil: "networkidle" })
await page.getByLabel("Full name").fill("Bilal Ahmed")
await page.getByLabel("Email", { exact: true }).fill(email)
await page.getByLabel("Password").fill("short")
await page.getByRole("button", { name: "Create account" }).click()
console.log("weak password:", await page.locator("p.text-destructive").allTextContents(), "| focus:", await page.evaluate(() => document.activeElement?.getAttribute("name")))
await page.getByLabel("Password").fill("Sneakers2026")
await page.getByRole("button", { name: "Create account" }).click()
await page.waitForURL(/\/account$/, { timeout: 15000 })
await page.waitForLoadState("networkidle")
console.log("account h1:", await page.locator("h1").textContent())
await page.getByRole("button", { name: "Add an address" }).click()
await page.getByRole("form", { name: "New address" }).getByLabel("Full name").fill("Bilal Ahmed")
await page.getByRole("form", { name: "New address" }).getByLabel("Mobile number").fill("03211234567")
await page.getByRole("form", { name: "New address" }).getByLabel("House and street").fill("Flat 3, Block B, Gulberg III")
await page.getByRole("form", { name: "New address" }).getByLabel("City").fill("Lahore")
await page.getByRole("form", { name: "New address" }).getByLabel("Province").selectOption("Punjab")
await page.getByRole("button", { name: "Save address" }).click()
await page.waitForTimeout(2000)
console.log("addresses:", (await page.locator("#addresses").innerText()).replace(/\n/g, " / ").slice(0, 200))
if (shots) await page.screenshot({ path: ".qa-tmp/smoke-account.png", fullPage: true })
await page.getByRole("button", { name: "Sign out" }).click()
await page.waitForURL(`${base}/`, { timeout: 15000 })
await page.goto(`${base}/account`, { waitUntil: "networkidle" })
console.log("guest /account →", page.url())
await page.getByLabel("Email").fill(email)
await page.getByLabel("Password").fill("wrong-password1")
await page.getByRole("button", { name: "Sign in" }).click()
await page.waitForTimeout(1500)
console.log("wrong password:", await page.locator("[role=alert]").filter({ hasText: /./ }).allTextContents())
await page.getByLabel("Password").fill("Sneakers2026")
await page.getByRole("button", { name: "Sign in" }).click()
await page.getByRole("heading", { level: 1, name: /^Hi, / }).waitFor({ timeout: 15000 })
console.log("signed in again:", page.url(), await page.locator("h1").textContent())
await browser.close()
