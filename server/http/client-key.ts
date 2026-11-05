/**
 * The rate-limit key from `X-Forwarded-For`. Each proxy appends the address it received the request
 * from, so only the last `trustedHops` entries were written by our own infrastructure; anything to
 * their left came from the client and can be forged (BUG-015). With `trustedHops` 0 the header is
 * ignored and every request shares one key.
 */
export function forwardedClient(header: string | null, trustedHops: number): string {
  if (trustedHops < 1 || !header) return "direct"
  const entries = header
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  return entries[entries.length - trustedHops] ?? entries[0] ?? "direct"
}
