const base = "http://localhost:3200"
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(base + "/api/health")).ok) break
  } catch {}
  await new Promise((r) => setTimeout(r, 1000))
}
const html = await (await fetch(base + "/")).text()
const hrefs = [...new Set([...html.matchAll(/href="([^"]*(?:kind=|pre-loved\?)[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&")))]
for (const href of hrefs) {
  const page = await (await fetch(base + href)).text()
  const found = page.match(/>(\d+)(?:<!-- -->)? pairs?</) ?? page.match(/>(No) pairs found/)
  console.log(href, found ? found[1] : "?")
}
