// Measures sample advances with a given Inter build against the Figma box widths.
import { chromium } from "@playwright/test"
import fs from "node:fs"

const file = process.argv[2] ?? ".qa-tmp/Inter-3.19.var.woff2"
const font = fs.readFileSync(file).toString("base64")
const samples = [
  ["41", 20, 600, -0.2, 23],
  ["42", 20, 600, -0.2, 26],
  ["41", 30, 700, 0, 35],
  ["Rs. 14,999", 50, 700, -1, 248],
  ["PKR 19,999", 28, 400, -0.84, 145],
  ["Protected Payments", 22, 500, 0, 214],
  ["Secure checkout", 22, 700, 0, 219],
  ["ADD TO CART", 26, 800, 0, 181],
  ["Size guide", 26, 700, 0, 145],
  ["Women", 20, 500, -0.2, 72],
  ["Men", 20, 500, -0.2, 42],
  ["Filters", 20, 600, 0, 61],
  ["PKR 34,999", 18, 500, -0.18, 101],
  ["Explore", 30, 700, 0, 137],
  ["Excellent", 32, 600, -0.32, 139],
  ["SIZE GUIDE", 26, 700, 0, 145],
  ["EXPLORE", 30, 700, 0, 137],
  ["Chat with our team", 22, 600, 0, 0],
  ["Order number (optional)", 20, 500, 0, 0],
]
const extra = process.env.EXTRA_CSS ?? ""
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(`<style>@font-face{font-family:T;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900}body{font-family:T}</style><div id=root></div>`)
const rows = await page.evaluate(async ([list, extra]) => {
  await document.fonts.load("600 20px T")
  return list.filter((item) => item[1]).map(([text, size, weight, ls, figma]) => {
    const span = document.createElement("span")
    span.textContent = text
    span.style.cssText = `font:${weight} ${size}px T;letter-spacing:${ls}px;white-space:nowrap;${extra}`
    document.getElementById("root").append(span, document.createElement("br"))
    const width = span.getBoundingClientRect().width
    return `${text.padEnd(20)} ${String(size).padStart(3)}px ${weight}  app ${width.toFixed(2).padStart(7)}  figma ${figma}  ceil-ok ${Math.ceil(width - 0.01) === figma}`
  })
}, [samples, extra])
console.log(rows.join("\n"))
await browser.close()
