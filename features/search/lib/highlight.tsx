import type { ReactNode } from "react"

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()

/**
 * `text` with every typed word marked, matched case- and accent-insensitively ("cafe" marks
 * "Café"). Folding keeps one character per original letter for Latin text, so the indexes line up.
 */
export function highlight(text: string, query: string): ReactNode {
  const words = fold(query).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 0)
  const folded = [...text].map((char) => fold(char).charAt(0) || char).join("")
  if (words.length === 0 || folded.length !== text.length) return text
  const marks = new Array<boolean>(text.length).fill(false)
  for (const word of words) {
    for (let index = folded.indexOf(word); index !== -1; index = folded.indexOf(word, index + 1)) {
      for (let offset = 0; offset < word.length; offset++) marks[index + offset] = true
    }
  }
  const parts: ReactNode[] = []
  let start = 0
  for (let index = 1; index <= text.length; index++) {
    if (index === text.length || marks[index] !== marks[start]) {
      const chunk = text.slice(start, index)
      parts.push(
        marks[start] ? (
          <mark key={start} className="bg-transparent font-extrabold text-current">
            {chunk}
          </mark>
        ) : (
          chunk
        ),
      )
      start = index
    }
  }
  return parts
}
