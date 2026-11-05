#!/usr/bin/env node
/**
 * Times client navigations right after hydration: loads the home page, waits for the header to
 * hydrate, clicks a primary nav link at once and reports how long the URL took to change (slow if over 3 s).
 * Usage: node qa/nav-race.mjs [runs] [browser]   (server on 127.0.0.1:3200; THROTTLE=6 slows Chromium's CPU)
 */
import { chromium, firefox, webkit } from "@playwright/test"

const runs = Number(process.argv[2] ?? 20)
const engine = { chromium, firefox, webkit }[process.argv[3] ?? "chromium"]
const browser = await engine.launch()
let slow = 0
for (let run = 0; run < runs; run++) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  if (process.env.THROTTLE && engine === chromium) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.THROTTLE) })
  }
  await page.goto("http://127.0.0.1:3200/", { waitUntil: "load" })
  await page.waitForFunction(() => {
    const header = document.querySelector("header")
    return !!header && Object.keys(header).some((key) => key.startsWith("__reactFiber"))
  })
  page.on("pageerror", (error) => console.log("pageerror", error.message))
  const rsc = { started: 0, finished: 0 }
  page.on("request", (request) => request.headers()["rsc"] && rsc.started++)
  page.on("requestfinished", (request) => request.headers()["rsc"] && rsc.finished++)
  const clickedAt = () => `rsc requests ${rsc.started} started / ${rsc.finished} finished`
  await page.evaluate(() => {
    window.__navProbe = "no click seen"
    document.addEventListener("click", (event) => queueMicrotask(() => (window.__navProbe = String(event.defaultPrevented))))
  })
  // The tabs only open their dropdown (D-049); the navigation measured is the dropdown's Brand New link.
  await page.locator("header").first().getByRole("button", { name: "Sale", exact: true }).click()
  await page.locator("[id^=nav-panel-]:not([hidden])").getByRole("link", { name: "Brand New" }).click()
  const atClick = clickedAt()
  const start = Date.now()
  const moved = await page.waitForURL(/\/collections\/sale\?kind=new$/, { timeout: 3000 }).then(() => true, () => false)
  if (!moved) {
    slow++
    const late = await page.waitForURL(/\/collections\/sale\?kind=new$/, { timeout: 15000 }).then(() => `arrived after ${Date.now() - start} ms; at click ${atClick}`, () => "never arrived")
    console.log(`run ${run + 1}: SLOW (${late}; prevented=${await page.evaluate(() => window.__navProbe)})`)
  } else console.log(`run ${run + 1}: navigated in ${Date.now() - start} ms; at click ${atClick}`)
  await page.close()
}
console.log(`slow ${slow}/${runs}`)
await browser.close()
