import { expect, test } from "@playwright/test"

import { waitForHydration } from "./support/panels"

/** Featured Drop slider (D-048): Brand New first, then Pre-Loved, each labelled in its own colour. */
test.describe("featured drop slider", () => {
  test("switches between the Brand New and Pre-Loved drops", async ({ page }) => {
    await page.goto("/")
    await waitForHydration(page)
    const slider = page.locator("section[aria-roledescription=carousel]")
    const picker = slider.getByRole("navigation", { name: "Featured drops" })
    const slides = slider.locator("[aria-roledescription=slide]")

    await expect(slides).toHaveCount(2)
    await expect(picker.getByRole("link", { name: "Brand New" })).toHaveAttribute("aria-current", "true")
    await expect(slides.nth(0)).toContainText("Brand New")
    await expect(slides.nth(1)).toHaveJSProperty("inert", true)
    // The controls sit on the photo, so they are on screen whenever the shoe is.
    const photo = await slides.nth(0).locator("img").first().boundingBox()
    for (const control of [picker, slider.getByRole("button", { name: "Next drop" }), slider.getByRole("button", { name: "Previous drop" })]) {
      const box = await control.boundingBox()
      expect(box!.y).toBeGreaterThanOrEqual(photo!.y)
      expect(box!.y + box!.height).toBeLessThanOrEqual(photo!.y + photo!.height)
    }

    await slider.getByRole("button", { name: "Next drop" }).click()
    await expect(picker.getByRole("link", { name: "Pre-Loved" })).toHaveAttribute("aria-current", "true")
    await expect(slides.nth(0)).toHaveJSProperty("inert", true)
    const preloved = slides.nth(1)
    await expect(preloved).toContainText("Pre-Loved")
    await expect(preloved).toContainText("Cond: Excellent")
    // One-off pair: its only size is preselected and there is no quantity stepper.
    await expect(preloved.getByRole("radio")).toHaveCount(1)
    await expect(preloved.getByRole("radio")).toBeChecked()
    await expect(preloved.getByRole("button", { name: "Increase quantity" })).toHaveCount(0)
    await expect(preloved.getByRole("link", { name: "Condition guide" })).toHaveAttribute("href", "/condition-guide")

    // Arrows wrap round: Next on the last drop returns to the first.
    await slider.getByRole("button", { name: "Next drop" }).click()
    await expect(picker.getByRole("link", { name: "Brand New" })).toHaveAttribute("aria-current", "true")
    await picker.getByRole("link", { name: "Pre-Loved" }).click()
    await expect(picker.getByRole("link", { name: "Pre-Loved" })).toHaveAttribute("aria-current", "true")
    await picker.getByRole("link", { name: "Brand New" }).click()
    await expect(picker.getByRole("link", { name: "Brand New" })).toHaveAttribute("aria-current", "true")
    await expect(slides.nth(0).getByRole("button", { name: "Increase quantity" })).toBeVisible()
  })

  test("the hidden slide never widens the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    await waitForHydration(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  })
})

test.describe("featured drop slider without JavaScript", () => {
  test.use({ javaScriptEnabled: false })

  test("both drops render and the picker links jump to them", async ({ page }) => {
    await page.goto("/")
    const slider = page.locator("section[aria-roledescription=carousel]")
    await expect(slider.locator("[aria-roledescription=slide]")).toHaveCount(2)
    await expect(slider.getByRole("link", { name: "Pre-Loved" })).toHaveAttribute("href", "#featured-drop-preloved")
  })
})
