/**
 * Client helper for the `medical-files` Edge Function.
 * Encryption key lives only in the function secrets — never in VITE_*.
 */
import { supabase, isSupabaseConfigured } from './supabase'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export function usesServerEncryption(): boolean {
  return isSupabaseConfigured && !!supabase && import.meta.env.VITE_USE_SERVER_ENCRYPTION !== 'false'
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

export async function uploadEncryptedViaEdge(
  patientId: number,
  file: File,
  fileId: string,
): Promise<{ path: string; size: number }> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large (max ${MAX_BYTES / (1024 * 1024)} MB)`)
  }

  const contentBase64 = await blobToBase64(file)
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${patientId}/${fileId}.${ext}`

  const { data, error } = await supabase.functions.invoke('medical-files', {
    body: {
      action: 'upload',
      path,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      contentBase64,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(String(data.error))

  return { path: data.path ?? path, size: file.size }
}

export async function downloadDecryptedViaEdge(
  path: string,
  mimeType = 'application/octet-stream',
): Promise<Blob> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.functions.invoke('medical-files', {
    body: {
      action: 'download',
      path,
      mimeType,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(String(data.error))
  if (!data?.contentBase64) throw new Error('Empty download response')

  return base64ToBlob(data.contentBase64, data.mimeType || mimeType)
}
