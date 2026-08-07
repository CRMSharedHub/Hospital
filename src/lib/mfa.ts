/**
 * TOTP-based MFA utility using Web Crypto API.
 * No external dependencies — uses HMAC-SHA1 for TOTP generation.
 * Implements RFC 6238.
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/=+$/, '').replace(/\s/g, '')
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0

  for (const char of cleaned) {
    const value = BASE32_CHARS.indexOf(char.toUpperCase())
    if (value === -1) continue
    buffer = (buffer << 5) | value
    bitsLeft += 5
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff)
      bitsLeft -= 8
    }
  }
  return new Uint8Array(bytes)
}

function base32Encode(bytes: Uint8Array): string {
  let result = ''
  let buffer = 0
  let bitsLeft = 0

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bitsLeft += 8
    while (bitsLeft >= 5) {
      result += BASE32_CHARS[(buffer >> (bitsLeft - 5)) & 0x1f]
      bitsLeft -= 5
    }
  }
  if (bitsLeft > 0) {
    result += BASE32_CHARS[(buffer << (5 - bitsLeft)) & 0x1f]
  }
  return result
}

function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8)
  let value = num
  for (let i = 7; i >= 0; i--) {
    bytes[i] = value & 0xff
    value = Math.floor(value / 0x100)
  }
  return bytes
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const keyBuffer = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer
  const msgBuffer = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength) as ArrayBuffer
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer)
  return new Uint8Array(signature)
}

/**
 * Generate a TOTP code for the given secret and time.
 * @param secret Base32-encoded secret
 * @param time Unix timestamp in seconds (default: now)
 * @param period TOTP period in seconds (default: 30)
 * @param digits Number of digits (default: 6)
 */
export async function generateTOTP(
  secret: string,
  time: number = Math.floor(Date.now() / 1000),
  period: number = 30,
  digits: number = 6,
): Promise<string> {
  const keyBytes = base32Decode(secret)
  const counter = Math.floor(time / period)
  const counterBytes = intToBytes(counter)
  const hmac = await hmacSha1(keyBytes, counterBytes)

  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = binary % Math.pow(10, digits)
  return otp.toString().padStart(digits, '0')
}

/**
 * Verify a TOTP code against the secret.
 * Allows ±1 time step for clock drift.
 */
export async function verifyTOTP(
  secret: string,
  code: string,
  time: number = Math.floor(Date.now() / 1000),
  period: number = 30,
): Promise<boolean> {
  for (const offset of [-1, 0, 1]) {
    const expectedCode = await generateTOTP(secret, time + offset * period, period)
    if (expectedCode === code) return true
  }
  return false
}

/**
 * Generate a new random TOTP secret (20 bytes = 160 bits).
 */
export function generateSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

/**
 * Generate a otpauth:// URI for QR code scanning.
 */
export function generateOTPAuthURI(
  secret: string,
  account: string,
  issuer: string = 'Hospital360',
): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

/**
 * Roles that require MFA.
 */
export const MFA_REQUIRED_ROLES = ['admin', 'doctor'] as const

export function isMFARequired(role: string): boolean {
  // E2E / explicit opt-out only — never skip silently in real deployments
  if (import.meta.env.VITE_DISABLE_MFA === 'true') return false
  return (MFA_REQUIRED_ROLES as readonly string[]).includes(role)
}
