/** Only same-site paths are followed after sign-in (no open redirects). */
export function safeNext(next: string | string[] | null | undefined, fallback = "/account") {
  const value = Array.isArray(next) ? next[0] : next
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback
}
