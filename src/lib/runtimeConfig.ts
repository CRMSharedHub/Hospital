import { isSupabaseConfigured } from './supabase'

/**
 * Demo auth (local plaintext users) is allowed only when:
 * - Explicitly opted in via VITE_ALLOW_DEMO_AUTH=true (E2E / local preview), or
 * - Running a non-production build (vite dev).
 * Production builds fail closed unless Supabase is configured.
 */
export function isDemoAuthAllowed(): boolean {
  if (import.meta.env.VITE_ALLOW_DEMO_AUTH === 'true') return true
  if (import.meta.env.PROD) return false
  return true
}

/** When true, MFA role requirements are skipped (E2E only). */
export function isMfaDisabled(): boolean {
  return import.meta.env.VITE_DISABLE_MFA === 'true'
}

/** Production deploy without Supabase and without explicit demo opt-in. */
export function isProductionMisconfigured(): boolean {
  return import.meta.env.PROD && !isSupabaseConfigured && !isDemoAuthAllowed()
}
