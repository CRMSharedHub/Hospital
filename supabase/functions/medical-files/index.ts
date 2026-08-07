// Supabase Edge Function: medical-files
// Secrets (Dashboard → Edge Functions → Secrets):
//   ENCRYPTION_KEY  — min 32 chars, never ship to the browser
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY — auto-injected on hosted Supabase
//
// Deploy: supabase functions deploy medical-files

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 256
const PBKDF2_ITERATIONS = 250_000
const PATH_RE = /^\d+\/[A-Za-z0-9._-]+$/
const STAFF_ROLES = new Set(['admin', 'doctor', 'nurse'])

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Format: saltLen(4 LE) + salt + ivLen(4 LE) + iv + ciphertext — matches client encryption.ts */
async function encryptPayload(plain: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
      key,
      plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.byteLength) as ArrayBuffer,
    ),
  )

  const headerSize = 4 + salt.length + 4 + iv.length
  const out = new Uint8Array(headerSize + ciphertext.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, salt.length, true)
  out.set(salt, 4)
  dv.setUint32(4 + salt.length, iv.length, true)
  out.set(iv, 4 + salt.length + 4)
  out.set(ciphertext, headerSize)
  return out
}

async function decryptPayload(combined: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const dv = new DataView(combined.buffer, combined.byteOffset, combined.byteLength)
  const saltLen = dv.getUint32(0, true)
  const salt = combined.slice(4, 4 + saltLen)
  const ivLen = dv.getUint32(4 + saltLen, true)
  const iv = combined.slice(4 + saltLen + 4, 4 + saltLen + 4 + ivLen)
  const ciphertext = combined.slice(4 + saltLen + 4 + ivLen)
  const key = await deriveKey(passphrase, salt)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
    key,
    ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer,
  )
  return new Uint8Array(plain)
}

function getEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing secret: ${name}`)
  return v
}

function parsePatientFolder(path: string): number | null {
  const folder = path.split('/')[0]
  const id = Number(folder)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Service-role storage bypasses RLS — enforce the same rules here:
 * - admin/doctor/nurse: read + write any patient folder
 * - patient: read only their linked_patient_id folder; no upload
 */
async function authorizePath(
  admin: SupabaseClient,
  userId: string,
  path: string,
  action: 'upload' | 'download',
): Promise<Response | null> {
  const patientId = parsePatientFolder(path)
  if (patientId == null) {
    return json({ error: 'Invalid patient folder in path' }, 400)
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('role, linked_patient_id')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return json({ error: 'Profile not found' }, 403)
  }

  const role = String(profile.role || '')

  if (STAFF_ROLES.has(role)) {
    return null
  }

  if (role === 'patient') {
    if (profile.linked_patient_id !== patientId) {
      return json({ error: 'Forbidden: path is not your patient folder' }, 403)
    }
    if (action === 'upload') {
      return json({ error: 'Patients cannot upload medical files' }, 403)
    }
    return null
  }

  return json({ error: 'Forbidden' }, 403)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization bearer token' }, 401)
    }

    const encryptionKey = getEnv('ENCRYPTION_KEY')
    if (encryptionKey.length < 32) {
      return json({ error: 'ENCRYPTION_KEY must be at least 32 characters' }, 500)
    }

    const supabaseUrl = getEnv('SUPABASE_URL')
    const anonKey = getEnv('SUPABASE_ANON_KEY')
    const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: 'Invalid session' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const body = await req.json()
    const action = body.action as string

    if (action === 'upload') {
      const path = String(body.path || '')
      const contentBase64 = String(body.contentBase64 || '')
      if (!path || !contentBase64) {
        return json({ error: 'path and contentBase64 are required' }, 400)
      }
      if (!PATH_RE.test(path)) {
        return json({ error: 'Invalid storage path' }, 400)
      }

      const denied = await authorizePath(admin, userData.user.id, path, 'upload')
      if (denied) return denied

      const plain = base64ToBytes(contentBase64)
      if (plain.byteLength > 10 * 1024 * 1024) {
        return json({ error: 'File too large (max 10MB)' }, 413)
      }

      const encrypted = await encryptPayload(plain, encryptionKey)
      const { error: uploadError } = await admin.storage
        .from('medical-files')
        .upload(path, encrypted, {
          contentType: 'application/octet-stream',
          upsert: false,
        })
      if (uploadError) return json({ error: uploadError.message }, 400)

      return json({
        path,
        size: plain.byteLength,
        encryptedBy: 'edge:medical-files',
        userId: userData.user.id,
      })
    }

    if (action === 'download') {
      const path = String(body.path || '')
      const mimeType = String(body.mimeType || 'application/octet-stream')
      if (!path || !PATH_RE.test(path)) {
        return json({ error: 'Invalid storage path' }, 400)
      }

      const denied = await authorizePath(admin, userData.user.id, path, 'download')
      if (denied) return denied

      const { data, error: downloadError } = await admin.storage
        .from('medical-files')
        .download(path)
      if (downloadError) return json({ error: downloadError.message }, 404)

      const buf = new Uint8Array(await data.arrayBuffer())
      const plain = await decryptPayload(buf, encryptionKey)
      return json({
        path,
        mimeType,
        contentBase64: bytesToBase64(plain),
      })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: message }, 500)
  }
})
