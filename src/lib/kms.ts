/**
 * KMS key resolution — prefer Edge unwrap, then env, then demo stub.
 */

import { isSupabaseConfigured, supabase } from './supabase'

export type KmsProvider = 'env' | 'edge-mock' | 'aws-kms' | 'vault'

export interface KmsResolveResult {
  provider: KmsProvider
  keyId: string
  /** Passphrase / DEK material for AES — never log this. */
  material: string
  stub: boolean
}

export function resolveLocalKmsKey(): KmsResolveResult {
  const envKey = import.meta.env.VITE_ENCRYPTION_KEY
  if (typeof envKey === 'string' && envKey.length >= 32) {
    return {
      provider: 'env',
      keyId: 'env:VITE_ENCRYPTION_KEY',
      material: envKey,
      stub: false,
    }
  }
  const demo = 'dynex360-demo-kms-key-do-not-use-in-prod!!'
  return {
    provider: 'edge-mock',
    keyId: 'mock:local-demo',
    material: demo,
    stub: true,
  }
}

/** Prefer Edge `kms-unwrap` when Supabase is live (keeps DEK off the Vite bundle). */
export async function resolveKmsKey(): Promise<KmsResolveResult> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('kms-unwrap', { body: {} })
      if (!error && data?.material && typeof data.material === 'string' && data.material.length >= 32) {
        return {
          provider: (data.provider as KmsProvider) || 'edge-mock',
          keyId: (data.keyId as string) || 'edge:ENCRYPTION_KEY',
          material: data.material,
          stub: !!data.stub,
        }
      }
    } catch {
      // fall through
    }
  }
  return resolveLocalKmsKey()
}

export function describeKmsStatus(): { configured: boolean; provider: KmsProvider; keyId: string } {
  const r = resolveLocalKmsKey()
  const envOk =
    typeof import.meta.env.VITE_ENCRYPTION_KEY === 'string' &&
    import.meta.env.VITE_ENCRYPTION_KEY.length >= 32
  return {
    configured: envOk || isSupabaseConfigured,
    provider: isSupabaseConfigured && !envOk ? 'edge-mock' : r.provider,
    keyId: isSupabaseConfigured && !envOk ? 'edge:ENCRYPTION_KEY (preferred)' : r.keyId,
  }
}
