import { chromium } from "@playwright/test"

const browser = await chromium.launch()
for (const reducedMotion of ["no-preference"]) {
  const page = await browser.newPage({ viewport: { width: 1536, height: 730 }, reducedMotion })
  await page.goto("http://localhost:3200/", { waitUntil: "load" })
  await page.waitForTimeout(1500)
  const section = page.locator("section[aria-roledescription=carousel]")
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: ".qa-tmp/featured-user.png" })
  const info = await section.evaluate((node) => {
    const header = node.querySelector("nav")?.getBoundingClientRect()
    return { sectionTop: Math.round(node.getBoundingClientRect().top), sectionHeight: Math.round(node.getBoundingClientRect().height), nav: header && { top: Math.round(header.top), left: Math.round(header.left) } }
  })
  console.log(JSON.stringify(info))
  await page.close()
}
await browser.close()
