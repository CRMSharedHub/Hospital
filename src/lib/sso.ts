/**
 * SSO / OIDC — stub for demo + real Supabase OAuth when configured.
 */

import { isSupabaseConfigured, supabase } from './supabase'

export type SsoProvider = 'oidc' | 'azure' | 'okta' | 'google' | 'github'

export interface SsoStartResult {
  provider: SsoProvider | string
  authorizeUrl: string
  state: string
  stub: boolean
  mode: 'supabase-oauth' | 'stub'
}

export interface SsoCallbackResult {
  ok: boolean
  email?: string
  name?: string
  externalSub?: string
  message: string
  stub: true
}

/** Env: VITE_SSO_PROVIDER=azure|google|github|okta — enables real OAuth button. */
export function getConfiguredSsoProvider(): SsoProvider | null {
  const raw = (import.meta.env.VITE_SSO_PROVIDER as string | undefined)?.trim().toLowerCase()
  if (!raw) return null
  if (raw === 'azure-ad') return 'azure'
  if (['oidc', 'azure', 'okta', 'google', 'github'].includes(raw)) return raw as SsoProvider
  return null
}

export function isRealSsoAvailable(): boolean {
  return isSupabaseConfigured && !!supabase && !!getConfiguredSsoProvider()
}

/** Build a mock authorize URL (never hits a real IdP). */
export function startSsoLogin(
  provider: SsoProvider = 'oidc',
  redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost/login',
): SsoStartResult {
  const state = `sso-${Date.now()}`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'dynex360-stub',
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    stub: '1',
  })
  return {
    provider,
    authorizeUrl: `https://sso.example.invalid/authorize?${params.toString()}`,
    state,
    stub: true,
    mode: 'stub',
  }
}

/**
 * Start Supabase OAuth (Dashboard provider must be enabled).
 * Maps azure/okta → supabase provider names where needed.
 */
export async function startSupabaseOAuth(
  provider?: SsoProvider | null,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const p = provider ?? getConfiguredSsoProvider()
  if (!p) return { error: 'VITE_SSO_PROVIDER not set' }

  const supabaseProvider =
    p === 'oidc' || p === 'okta' ? 'azure' : p === 'azure' ? 'azure' : p

  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/` : undefined

  const { error } = await supabase.auth.signInWithOAuth({
    provider: supabaseProvider as 'azure' | 'google' | 'github',
    options: { redirectTo },
  })
  if (error) return { error: error.message }
  return {}
}

/**
 * Resolve a stub SSO callback.
 * Demo: ?sso=1&email=admin@cityhospital.com maps to that demo account.
 */
export function completeSsoCallback(search: URLSearchParams): SsoCallbackResult {
  if (search.get('stub') !== '1' && search.get('sso') !== '1') {
    return { ok: false, message: 'Not an SSO stub callback', stub: true }
  }
  const email = search.get('email') || 'admin@cityhospital.com'
  const name = search.get('name') || email.split('@')[0] || 'SSO User'
  const externalSub = search.get('sub') || `stub-sub-${email}`
  return {
    ok: true,
    email,
    name,
    externalSub,
    message: 'SSO stub accepted — map to local/demo user',
    stub: true,
  }
}
