#!/usr/bin/env node
/**
 * Summarises a Playwright JSON report: totals by status and, for every failure, the title and the
 * first lines of its error (for the overflow audit that is the violation list).
 * Usage: node qa/report-summary.mjs qa/out/overflow-audit.json [maxFailures]   (GROUP=1 groups audit violations)
 */
import fs from "node:fs"

const file = process.argv[2]
const max = Number(process.argv[3] ?? 40)
const report = JSON.parse(fs.readFileSync(file, "utf8"))
const counts = {}
const failures = []

const walk = (suite, trail) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests) {
      const result = test.results.at(-1)
      const status = result?.status ?? "not run"
      counts[status] = (counts[status] ?? 0) + 1
      if (status !== "passed" && status !== "skipped") {
        const message = (result?.errors ?? []).map((error) => error.message ?? "").join("\n")
        failures.push(`${[...trail, spec.title].join(" › ")} [${test.projectName}]\n${message}`)
      }
    }
  }
  for (const child of suite.suites ?? []) walk(child, [...trail, child.title])
}
for (const suite of report.suites) walk(suite, [])

console.log(JSON.stringify(counts))
if (process.env.GROUP) {
  // Overflow audit: group violations by kind + element, listing the cases each one appears in.
  const groups = new Map()
  for (const failure of failures) {
    const [title, ...rest] = failure.split("\n")
    const text = rest.join("\n").replace(/\u001b\[\d+m/g, "")
    const kinds = [...text.matchAll(/"kind": "([^"]+)"/g)].map((match) => match[1])
    const selectors = [...text.matchAll(/"selector": "((?:[^"\\]|\\.)*)"/g)].map((match) => match[1])
    kinds.forEach((kind, index) => {
      const key = `${kind} ${selectors[index] ?? ""}`
      groups.set(key, [...(groups.get(key) ?? []), title.replace(/ \[chromium\]$/, "")])
    })
  }
  for (const [key, cases] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${cases.length}× ${key}\n  e.g. ${[...new Set(cases)].slice(0, 4).join(" | ")}`)
  }
} else {
  console.log(failures.slice(0, max).map((failure) => failure.split("\n").slice(0, 15).join("\n")).join("\n\n"))
  if (failures.length > max) console.log(`… ${failures.length - max} more`)
}
