import "server-only"

import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto"

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCallback(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))))

const PARAMS = { N: 16384, r: 8, p: 1 }
const KEY_LENGTH = 64

/** scrypt with a per-password salt, encoded as `scrypt$N$r$p$salt$hash` so parameters can evolve. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...PARAMS, maxmem: 64 * 1024 * 1024 })
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$")
}

/** A real hash of a random password, verified for unknown emails so timing doesn't reveal accounts. */
let decoy: Promise<string> | undefined
export const decoyHash = () => (decoy ??= hashPassword(randomBytes(16).toString("hex")))

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = encoded.split("$")
  if (scheme !== "scrypt" || !salt || !hash) return false
  const expected = Buffer.from(hash, "base64url")
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  })
  return timingSafeEqual(key, expected)
}
