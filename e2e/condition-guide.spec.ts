import { expect, test } from "@playwright/test"

import { waitForHydration } from "./support/panels"

const GRADES = ["Like New", "Excellent", "Great", "Good", "Minor Marks"]

/** Condition Guide (D-046): footer entry, the self-playing grade explorer and its no-JavaScript list. */
test.describe("condition guide", () => {
  test("the footer links to it right below Size Guide", async ({ page }) => {
    await page.goto("/faq")
    const help = page.getByRole("contentinfo").getByRole("navigation", { name: "Help" }).getByRole("link")
    const labels = await help.allTextContents()
    expect(labels.indexOf("Condition Guide")).toBe(labels.indexOf("Size Guide") + 1)
    await help.filter({ hasText: "Condition Guide" }).click()
    await expect(page).toHaveURL(/\/condition-guide$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/condition guide/i)
  })

  // D-047: the guide lives only on its own page; Pre-Loved runs banner, toolbar, grid like every listing.
  test("Pre-Loved has no guide section and its condition links lead to the guide page", async ({ page }) => {
    await page.goto("/pre-loved")
    await expect(page.getByRole("heading", { name: /sneaker condition guide/i })).toHaveCount(0)
    const preLoved = await page.getByRole("combobox").first().boundingBox()
    await page.goto("/collections/men")
    const collection = await page.getByRole("combobox").first().boundingBox()
    expect(preLoved?.y).toBe(collection?.y)
    await page.goto("/pre-loved")
    await page.getByRole("link", { name: "What condition grades mean" }).first().click()
    await expect(page).toHaveURL(/\/condition-guide$/)
  })

  test("autoplays through the grades, pauses, and follows the keyboard", async ({ page }) => {
    // The suite runs with reduced motion (playwright.config.ts); autoplay only exists without it.
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.goto("/condition-guide")
    await waitForHydration(page)
    const tabs = page.getByRole("tab")
    await expect(tabs).toHaveText(GRADES.map((grade) => new RegExp(grade)))
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true")
    await page.mouse.move(0, 0)
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true", { timeout: 9000 })

    await page.getByRole("button", { name: "Pause the guide" }).click()
    await expect(page.getByRole("button", { name: "Play the guide" })).toBeVisible()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(7000)
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true")

    await tabs.nth(1).focus()
    await page.keyboard.press("End")
    await expect(tabs.last()).toBeFocused()
    await expect(page.getByRole("tabpanel")).toContainText("Minor Marks")
    await expect(page.getByRole("tabpanel").getByRole("meter", { name: "Wear level" })).toHaveAttribute("aria-valuenow", "5")
    await page.keyboard.press("Home")
    await expect(page.getByRole("tabpanel").getByRole("meter")).toHaveAttribute("aria-valuenow", "1")
  })

  test("never autoplays with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/condition-guide")
    await waitForHydration(page)
    await expect(page.getByRole("button", { name: /the guide/ })).toHaveCount(0)
    await page.waitForTimeout(7000)
    await expect(page.getByRole("tab").first()).toHaveAttribute("aria-selected", "true")
  })
})

test.describe("condition guide without JavaScript", () => {
  test.use({ javaScriptEnabled: false })

  test("lists every grade with its details", async ({ page }) => {
    await page.goto("/condition-guide")
    for (const grade of GRADES) await expect(page.getByRole("heading", { level: 3, name: grade, exact: true })).toBeVisible()
    await expect(page.getByRole("meter")).toHaveCount(5)
  })
})
