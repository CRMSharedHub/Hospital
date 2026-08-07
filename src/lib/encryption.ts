/**
 * AES-GCM encryption for medical files at rest.
 * Uses Web Crypto API — no external dependencies.
 *
 * Key derivation: PBKDF2 from a passphrase + per-file random salt.
 * Encryption: AES-GCM with 256-bit key, 96-bit IV, 128-bit auth tag.
 */

const KEY_DERIVATION_ITERATIONS = 250_000
const SALT_LENGTH = 16 // 128-bit salt
const IV_LENGTH = 12 // 96-bit IV for AES-GCM
const KEY_LENGTH = 256 // AES-256

// ── Key management ─────────────────────────────────────────

let cachedKey: CryptoKey | null = null
let cachedPassphrase: string | null = null

/**
 * Derive an AES-GCM key from a passphrase and salt using PBKDF2.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: KEY_DERIVATION_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Passphrase for client-side file encryption.
 * Never fall back to anon key or a hardcoded default — those ship in the bundle.
 * Production PHI uploads require VITE_ENCRYPTION_KEY (prefer server-side KMS long-term).
 */
export function isEncryptionConfigured(): boolean {
  const envKey = import.meta.env.VITE_ENCRYPTION_KEY
  return typeof envKey === 'string' && envKey.length >= 32
}

function getEncryptionPassphrase(): string {
  const envKey = import.meta.env.VITE_ENCRYPTION_KEY
  if (typeof envKey === 'string' && envKey.length >= 32) return envKey
  throw new Error(
    'VITE_ENCRYPTION_KEY is required for medical file encryption (min 32 characters). ' +
      'Do not use the Supabase anon key. Prefer server-side KMS for production PHI.',
  )
}

/**
 * Get the cached or derive a new CryptoKey for the current passphrase.
 */
async function getEncryptionKey(salt: Uint8Array): Promise<CryptoKey> {
  const passphrase = getEncryptionPassphrase()
  if (cachedKey && cachedPassphrase === passphrase) return cachedKey
  cachedKey = await deriveKey(passphrase, salt)
  cachedPassphrase = passphrase
  return cachedKey
}

// ── Encryption / Decryption ────────────────────────────────

export interface EncryptedPayload {
  /** Encrypted data as ArrayBuffer */
  ciphertext: ArrayBuffer
  /** Random salt used for key derivation (base64) */
  salt: string
  /** Random IV used for AES-GCM (base64) */
  iv: string
}

/**
 * Encrypt a file's contents using AES-GCM.
 * @param fileData Raw file data as ArrayBuffer or Blob
 * @returns Encrypted payload with salt and IV
 */
export async function encryptFile(fileData: ArrayBuffer | Blob): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const key = await getEncryptionKey(salt)

  const data: ArrayBuffer = fileData instanceof Blob ? await fileData.arrayBuffer() : fileData

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
    key,
    data,
  )

  return {
    ciphertext,
    salt: uint8ToBase64(salt),
    iv: uint8ToBase64(iv),
  }
}

/**
 * Decrypt a file's contents using AES-GCM.
 * @param payload Encrypted payload with salt and IV
 * @returns Decrypted data as ArrayBuffer
 */
export async function decryptFile(payload: EncryptedPayload): Promise<ArrayBuffer> {
  const salt = base64ToUint8(payload.salt)
  const iv = base64ToUint8(payload.iv)

  const key = await getEncryptionKey(salt)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
    key,
    payload.ciphertext,
  )

  return plaintext
}

/**
 * Encrypt a file and return an encrypted Blob ready for upload.
 * The metadata (salt, IV) is prepended to the encrypted data as a header.
 * Format: [4 bytes salt length][salt][4 bytes IV length][iv][ciphertext]
 */
export async function encryptFileForUpload(file: File): Promise<Blob> {
  const payload = await encryptFile(file)
  const saltBytes = base64ToUint8(payload.salt)
  const ivBytes = base64ToUint8(payload.iv)
  const ciphertext = new Uint8Array(payload.ciphertext)

  // Build header: saltLen(4) + salt + ivLen(4) + iv + ciphertext
  const headerSize = 4 + saltBytes.length + 4 + ivBytes.length
  const combined = new Uint8Array(headerSize + ciphertext.length)

  const dv = new DataView(combined.buffer)
  dv.setUint32(0, saltBytes.length, true)
  combined.set(saltBytes, 4)
  dv.setUint32(4 + saltBytes.length, ivBytes.length, true)
  combined.set(ivBytes, 4 + saltBytes.length + 4)
  combined.set(ciphertext, headerSize)

  return new Blob([combined], { type: 'application/octet-stream' })
}

/**
 * Decrypt a downloaded file (from Supabase Storage or local).
 * Extracts the header (salt, IV) and decrypts the ciphertext.
 * @param encryptedBlob The encrypted blob with header
 * @returns Decrypted blob (with original MIME type if provided)
 */
export async function decryptDownloadedFile(encryptedBlob: Blob, mimeType?: string): Promise<Blob> {
  const buf = new Uint8Array(await encryptedBlob.arrayBuffer())
  const dv = new DataView(buf.buffer)

  const saltLen = dv.getUint32(0, true)
  const salt = buf.slice(4, 4 + saltLen)
  const ivLen = dv.getUint32(4 + saltLen, true)
  const iv = buf.slice(4 + saltLen + 4, 4 + saltLen + 4 + ivLen)
  const ciphertext = buf.slice(4 + saltLen + 4 + ivLen)

  const key = await getEncryptionKey(salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
    key,
    ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer,
  )

  return new Blob([decrypted], { type: mimeType || 'application/octet-stream' })
}

/**
 * Check if a blob is encrypted (has the header format).
 */
export async function isEncryptedBlob(blob: Blob): Promise<boolean> {
  if (blob.size < 12) return false // Minimum: 4 + 16 + 4 + 12 = 36 bytes
  const buf = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
  const dv = new DataView(buf.buffer)
  const saltLen = dv.getUint32(0, true)
  return saltLen === SALT_LENGTH
}

// ── Helpers ────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Generate a SHA-256 hash of a file for integrity verification.
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = new Uint8Array(hashBuffer)
  return uint8ToBase64(hashArray)
}
