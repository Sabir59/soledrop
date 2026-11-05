# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: header.spec.ts >> nav dropdown >> opens on hover after the intent delay and closes after leaving
- Location: e2e\header.spec.ts:19:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('header').first().getByRole('button', { name: 'Men', exact: true })
Expected: "true"
Received: "false"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" locator('header').first().getByRole('button', { name: 'Men', exact: true }) with timeout 5000ms
  - waiting for locator('header').first().getByRole('button', { name: 'Men', exact: true })
    13 × locator resolved to <button type="button" aria-expanded="false" aria-controls="nav-panel-1" class="cursor-pointer text-20 font-bold underline-offset-5 transition-colors hover:text-brand hover:underline xl:text-22 3xl:text-24">Men</button>
       - unexpected value "false"

```

```yaml
- button "Men"
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test"
  2   | 
  3   | import { waitForHydration } from "./support/panels"
  4   | 
  5   | /**
  6   |  * Header interaction checklist (E3): nav dropdowns, search overlay, account popover, mini-cart and
  7   |  * mobile drawer — open/close paths, keyboard, focus return, hover intent, states, and the
  8   |  * no-JavaScript fallbacks. Desktop 1440 unless a test sets a phone viewport.
  9   |  */
  10  | 
  11  | const header = (page: Page) => page.locator("header").first()
  12  | 
  13  | async function ready(page: Page, route = "/") {
  14  |   await page.goto(route, { waitUntil: "load" })
  15  |   await waitForHydration(page)
  16  | }
  17  | 
  18  | test.describe("nav dropdown", () => {
  19  |   test("opens on hover after the intent delay and closes after leaving", async ({ page }) => {
  20  |     await ready(page)
  21  |     const trigger = header(page).getByRole("button", { name: "Men", exact: true })
  22  |     const panel = page.locator(`#${await trigger.getAttribute("aria-controls")}`)
  23  |     await trigger.hover()
> 24  |     await expect(trigger).toHaveAttribute("aria-expanded", "true")
      |                           ^ Error: expect(locator).toHaveAttribute(expected) failed
  25  |     await expect(panel).toBeVisible()
  26  |     await page.mouse.move(700, 880)
  27  |     await expect(panel).toBeHidden()
  28  |     await expect(trigger).toHaveAttribute("aria-expanded", "false")
  29  |   })
  30  | 
  31  |   test("a quick pass over the nav does not open a panel", async ({ page }) => {
  32  |     await ready(page)
  33  |     const trigger = header(page).getByRole("button", { name: "Women", exact: true })
  34  |     const box = (await trigger.boundingBox())!
  35  |     await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  36  |     await page.mouse.move(box.x + box.width / 2, box.y + 400)
  37  |     await page.waitForTimeout(300)
  38  |     await expect(trigger).toHaveAttribute("aria-expanded", "false")
  39  |   })
  40  | 
  41  |   test("is keyboard operable: ArrowDown enters, arrows move, Escape returns focus", async ({ page }) => {
  42  |     await ready(page)
  43  |     const men = header(page).getByRole("button", { name: "Men", exact: true })
  44  |     await men.focus()
  45  |     await page.keyboard.press("ArrowDown")
  46  |     const panel = page.locator(`#${await men.getAttribute("aria-controls")}`)
  47  |     await expect(panel).toBeVisible()
  48  |     const links = panel.getByRole("link")
  49  |     await expect(links.first()).toBeFocused()
  50  |     await page.keyboard.press("ArrowDown")
  51  |     await expect(links.nth(1)).toBeFocused()
  52  |     await page.keyboard.press("End")
  53  |     await expect(links.last()).toBeFocused()
  54  |     await page.keyboard.press("Escape")
  55  |     await expect(panel).toBeHidden()
  56  |     await expect(men).toBeFocused()
  57  |     await page.keyboard.press("ArrowRight")
  58  |     await expect(header(page).getByRole("button", { name: "Women", exact: true })).toBeFocused()
  59  |   })
  60  | 
  61  |   // Regression BUG-007: hovering another item while focus is inside the open panel switched it closed.
  62  |   test("keeps one panel open at a time and closes on outside click and navigation", async ({ page }) => {
  63  |     await ready(page)
  64  |     const men = header(page).getByRole("button", { name: "Men", exact: true })
  65  |     const women = header(page).getByRole("button", { name: "Women", exact: true })
  66  |     await men.focus()
  67  |     await page.keyboard.press("Space")
  68  |     await women.hover()
  69  |     await expect(women).toHaveAttribute("aria-expanded", "true")
  70  |     await expect(men).toHaveAttribute("aria-expanded", "false")
  71  |     await page.mouse.click(700, 880)
  72  |     await expect(women).toHaveAttribute("aria-expanded", "false")
  73  |     await women.focus()
  74  |     await page.keyboard.press("ArrowDown")
  75  |     await page.locator(`#${await women.getAttribute("aria-controls")}`).getByRole("link", { name: "Brand New" }).click()
  76  |     await expect(page).toHaveURL(/\/collections\/women\?kind=new$/)
  77  |     await expect(page.locator("[id^=nav-panel-]:visible")).toHaveCount(0)
  78  |   })
  79  | 
  80  |   // D-045: every dropdown tab offers the same two choices and nothing else, and neither leads to an empty listing.
  81  |   test("every tab's dropdown offers exactly Brand New and Pre-Loved for that tab", async ({ page, request }) => {
  82  |     await ready(page)
  83  |     for (const [label, brandNew, preLoved] of [
  84  |       ["Men", "/collections/men?kind=new", "/pre-loved?gender=men"],
  85  |       ["Women", "/collections/women?kind=new", "/pre-loved?gender=women"],
  86  |       ["Sale", "/collections/sale?kind=new", "/collections/sale?kind=preloved"],
  87  |     ]) {
  88  |       const trigger = header(page).getByRole("button", { name: label, exact: true })
  89  |       await trigger.focus()
  90  |       await page.keyboard.press("ArrowDown")
  91  |       const panel = page.locator(`#${await trigger.getAttribute("aria-controls")}`)
  92  |       await expect(panel).toBeVisible()
  93  |       await expect(panel.getByRole("link")).toHaveText(["Brand New", "Pre-Loved"])
  94  |       await expect(panel.getByRole("link", { name: "Brand New" })).toHaveAttribute("href", brandNew)
  95  |       await expect(panel.getByRole("link", { name: "Pre-Loved" })).toHaveAttribute("href", preLoved)
  96  |       await page.keyboard.press("Escape")
  97  |       await expect(panel).toBeHidden()
  98  |       for (const href of [brandNew, preLoved]) {
  99  |         const html = await (await request.get(href)).text()
  100 |         expect(html, href).not.toContain("No pairs found")
  101 |       }
  102 |     }
  103 |   })
  104 | 
  105 |   // D-045: Brand New / Pre-Loved are pages of their own, never a filter the shopper can untick.
  106 |   test("a Brand New page offers no type filter and keeps its scope through filters and Clear All", async ({ page }) => {
  107 |     await ready(page, "/collections/sale?kind=new")
  108 |     const filters = page.getByRole("region", { name: "Filters" })
  109 |     await expect(filters.getByRole("heading", { name: "Gender" })).toBeVisible()
  110 |     await expect(filters.getByText("Type", { exact: true })).toHaveCount(0)
  111 |     await expect(filters.getByRole("checkbox", { name: /Brand New|Pre-Loved/ })).toHaveCount(0)
  112 |     await expect(filters.getByRole("button", { name: "Clear All" })).toHaveCount(0)
  113 |     await filters.getByRole("checkbox", { name: "Men", exact: true }).click()
  114 |     await expect(page).toHaveURL(/\/collections\/sale\?kind=new&gender=men$/)
  115 |     await filters.getByRole("button", { name: "Clear All" }).click()
  116 |     await expect(page).toHaveURL(/\/collections\/sale\?kind=new$/)
  117 |   })
  118 | 
  119 |   // Regression BUG-005: z-nav generated no CSS, so the page painted over the open panel.
  120 |   test("the open dropdown sits above the page, under its tab", async ({ page }) => {
  121 |     await ready(page)
  122 |     const men = header(page).getByRole("button", { name: "Men", exact: true })
  123 |     await men.focus()
  124 |     await page.keyboard.press("ArrowDown")
```