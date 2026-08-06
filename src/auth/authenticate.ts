import type { User } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { isDemoAuthAllowed } from '../lib/runtimeConfig'

/** Build-time gate so Rollup can drop `demoUsers` from real production bundles. */
function isDemoBundleEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO_AUTH === 'true'
}

/**
 * Authenticate against Supabase when configured.
 * Demo plaintext users load only when the demo bundle is enabled
 * (`vite`/`build:e2e`), so real `vite build` does not emit demo passwords.
 */
export async function authenticate(email: string, password: string): Promise<User | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (!profile) return null

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      avatar: profile.avatar,
      linkedPatientId: profile.linked_patient_id ?? undefined,
    }
  }

  if (!isDemoAuthAllowed() || !isDemoBundleEnabled()) {
    console.error('[Auth] Demo auth is disabled. Configure Supabase for production.')
    return null
  }

  const { DEMO_USERS } = await import('./demoUsers')
  const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password)
  if (!demoUser) return null
  const { password: _pw, ...user } = demoUser
  void _pw
  return user
}

/** Lazy-load demo accounts for quick-login UI (dev / e2e builds only). */
export async function loadDemoUsers() {
  if (!isDemoAuthAllowed() || !isDemoBundleEnabled()) return []
  const { DEMO_USERS } = await import('./demoUsers')
  return DEMO_USERS
}
