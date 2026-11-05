# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: header.spec.ts >> nav dropdown >> New Arrival is a link that opens its page, with no dropdown
- Location: e2e\header.spec.ts:154:3

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('header').first().getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'New Arrival', exact: true })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" locator('header').first().getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'New Arrival', exact: true }) with timeout 5000ms
  - waiting for locator('header').first().getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'New Arrival', exact: true })
    12 × locator resolved to <a href="/new-arrivals" class="cursor-pointer text-20 font-bold underline-offset-5 transition-colors hover:text-brand hover:underline xl:text-22 3xl:text-24">New Arrival</a>
       - unexpected value "inactive"

```

```yaml
- link "New Arrival":
  - /url: /new-arrivals
```

# Test source

```ts
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
  125 |     const panel = page.locator(`#${await men.getAttribute("aria-controls")}`)
  126 |     const card = (await panel.getByRole("list").boundingBox())!
  127 |     const tab = (await men.boundingBox())!
  128 |     expect(card.y).toBeGreaterThan(tab.y + tab.height)
  129 |     expect(card.x).toBeLessThan(tab.x)
  130 |     for (const link of await panel.getByRole("link").all()) {
  131 |       const box = (await link.boundingBox())!
  132 |       expect(box.height).toBeGreaterThanOrEqual(44)
  133 |       expect(await page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest("[id^=nav-panel-]"), [box.x + box.width / 2, box.y + box.height / 2])).toBe(true)
  134 |     }
  135 |   })
  136 | 
  137 |   // D-049: the dropdown tabs only open their dropdown; a click never leaves the page.
  138 |   test("clicking a tab opens its dropdown and never navigates", async ({ page }) => {
  139 |     await ready(page)
  140 |     for (const label of ["Men", "Women", "Sale"]) {
  141 |       await expect(header(page).getByRole("link", { name: label, exact: true })).toHaveCount(0)
  142 |     }
  143 |     const sale = header(page).getByRole("button", { name: "Sale", exact: true })
  144 |     await sale.click()
  145 |     await expect(sale).toHaveAttribute("aria-expanded", "true")
  146 |     await page.waitForTimeout(500)
  147 |     await expect(page).toHaveURL(/\/$/)
  148 |     await sale.click()
  149 |     await expect(sale).toHaveAttribute("aria-expanded", "true")
  150 |     await expect(page).toHaveURL(/\/$/)
  151 |   })
  152 | 
  153 |   // D-052: New Arrival is a page of its own, a plain link with no dropdown.
  154 |   test("New Arrival is a link that opens its page, with no dropdown", async ({ page }) => {
  155 |     await ready(page)
  156 |     await expect(header(page).getByRole("button", { name: "New Arrival", exact: true })).toHaveCount(0)
  157 |     const link = header(page).getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "New Arrival", exact: true })
  158 |     await expect(link).toHaveAttribute("href", "/new-arrivals")
  159 |     await expect(link).not.toHaveAttribute("aria-expanded", /.*/)
  160 |     await link.hover()
  161 |     await page.waitForTimeout(400)
  162 |     await expect(page.locator("[id^=nav-panel-]:visible")).toHaveCount(0)
  163 | 
  164 |     // The link joins the Arrow-key roving and closes an open dropdown when focus reaches it.
  165 |     const men = header(page).getByRole("button", { name: "Men", exact: true })
  166 |     await men.focus()
  167 |     await page.keyboard.press("Space")
  168 |     await expect(men).toHaveAttribute("aria-expanded", "true")
  169 |     await page.keyboard.press("ArrowLeft")
> 170 |     await expect(link).toBeFocused()
      |                        ^ Error: expect(locator).toBeFocused() failed
  171 |     await expect(page.locator("[id^=nav-panel-]:visible")).toHaveCount(0)
  172 |     await page.keyboard.press("Enter")
  173 |     await expect(page).toHaveURL(/\/new-arrivals$/)
  174 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText(/new\s*arrivals/i)
  175 |     await expect(header(page).getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "New Arrival", exact: true })).toHaveAttribute("aria-current", "page")
  176 |   })
  177 | 
  178 | })
  179 | 
  180 | test.describe("nav dropdown on touch", () => {
  181 |   test.use({ hasTouch: true })
  182 | 
  183 |   test("a tap toggles the dropdown without navigating", async ({ page }) => {
  184 |     await ready(page)
  185 |     const men = header(page).getByRole("button", { name: "Men", exact: true })
  186 |     await men.tap()
  187 |     await expect(men).toHaveAttribute("aria-expanded", "true")
  188 |     await men.tap()
  189 |     await expect(men).toHaveAttribute("aria-expanded", "false")
  190 |     await expect(page).toHaveURL(/\/$/)
  191 |   })
  192 | })
  193 | 
  194 | test.describe("search overlay", () => {
  195 |   test("is an APG combobox with suggestions, keyboard selection and Enter to search", async ({ page }) => {
  196 |     await ready(page)
  197 |     const trigger = header(page).getByRole("button", { name: "Search" })
  198 |     await trigger.click()
  199 |     const input = page.getByRole("combobox", { name: "Search shoes, brands and styles" })
  200 |     await expect(input).toBeFocused()
  201 |     await expect(input).toHaveAttribute("aria-autocomplete", "list")
  202 |     await expect(page.getByRole("group", { name: "Trending" })).toBeVisible()
  203 |     await input.fill("kayano")
  204 |     await expect(page.getByRole("group", { name: "Products" })).toBeVisible()
  205 |     await expect(page.getByRole("status").filter({ hasText: /result/ })).toHaveText(/\d+ result/)
  206 |     await page.keyboard.press("ArrowDown")
  207 |     const activeId = await input.getAttribute("aria-activedescendant")
  208 |     expect(activeId).toBeTruthy()
  209 |     await expect(page.locator(`#${activeId}`)).toHaveAttribute("aria-selected", "true")
  210 |     await page.keyboard.press("Escape")
  211 |     await expect(input).toBeHidden()
  212 |     await expect(trigger).toBeFocused()
  213 |     await trigger.click()
  214 |     await page.getByRole("combobox").fill("air max")
  215 |     await page.keyboard.press("Enter")
  216 |     await expect(page).toHaveURL(/\/search\?q=air(\+|%20)max$/)
  217 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText(/air max/i)
  218 |   })
  219 | 
  220 |   // Regression BUG-006: the global focus ring's box-shadow split the field into three white blocks.
  221 |   test("the search field shows one focus ring around the whole field", async ({ page }) => {
  222 |     await ready(page)
  223 |     await header(page).getByRole("button", { name: "Search" }).click()
  224 |     await page.keyboard.type("n")
  225 |     const input = page.getByRole("combobox")
  226 |     await expect(input).toBeFocused()
  227 |     const shadow = await input.evaluate((element) => getComputedStyle(element).boxShadow)
  228 |     expect(shadow.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?/g, "")).toMatch(/^(none)?$/)
  229 |     expect(await page.getByRole("search").evaluate((element) => getComputedStyle(element).outlineWidth)).toBe("3px")
  230 |   })
  231 | 
  232 |   test("remembers recent searches and clears them", async ({ page }) => {
  233 |     await ready(page)
  234 |     await header(page).getByRole("button", { name: "Search" }).click()
  235 |     await page.getByRole("combobox").fill("bondi")
  236 |     await page.keyboard.press("Enter")
  237 |     await expect(page).toHaveURL(/q=bondi/)
  238 |     await waitForHydration(page)
  239 |     await header(page).getByRole("button", { name: "Search" }).click()
  240 |     const recent = page.getByRole("group", { name: "Recent searches" })
  241 |     await expect(recent.getByRole("option", { name: "bondi" })).toBeVisible()
  242 |     await page.getByRole("button", { name: "Clear recent searches" }).click()
  243 |     await expect(recent).toBeHidden()
  244 |   })
  245 | 
  246 |   test("offers did-you-mean and fallbacks when nothing matches", async ({ page }) => {
  247 |     await ready(page)
  248 |     await header(page).getByRole("button", { name: "Search" }).click()
  249 |     await page.getByRole("combobox").fill("kayanno zzqx")
  250 |     await expect(page.getByText("No results for “kayanno zzqx”")).toBeVisible()
  251 |     await page.getByRole("button", { name: "kayano zzqx" }).click()
  252 |     await expect(page.getByRole("combobox")).toHaveValue("kayano zzqx")
  253 |     await expect(page.getByRole("group", { name: "Popular categories" })).toBeVisible()
  254 |   })
  255 | 
  256 |   test("shows an inline offline message with retry", async ({ page, context }) => {
  257 |     await ready(page)
  258 |     await header(page).getByRole("button", { name: "Search" }).click()
  259 |     await context.setOffline(true)
  260 |     await expect(page.getByText("You're offline")).toBeVisible()
  261 |     await context.setOffline(false)
  262 |     await expect(page.getByText("You're offline")).toBeHidden()
  263 |   })
  264 | 
  265 |   test("is a full-screen sheet with Cancel on phones", async ({ page }) => {
  266 |     await page.setViewportSize({ width: 390, height: 800 })
  267 |     await ready(page)
  268 |     await header(page).getByRole("button", { name: "Search" }).click()
  269 |     const dialog = page.getByRole("dialog", { name: "Search" })
  270 |     const box = (await dialog.boundingBox())!
```