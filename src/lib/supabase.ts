import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// ── Validate environment configuration ─────────────────────
function validateSupabaseConfig(): { url: string; key: string } | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.PROD) {
      console.error(
        '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
        'Production requires Supabase. Set env vars or VITE_ALLOW_DEMO_AUTH=true for non-PHI demos only.',
      )
    } else {
      console.warn(
        '[Supabase] Not configured — running in demo mode. ' +
        'Copy .env.example to .env.local and fill in your Supabase credentials.',
      )
    }
    return null
  }

  // Validate URL format
  try {
    const parsed = new URL(supabaseUrl)
    if (!parsed.hostname.endsWith('.supabase.co')) {
      console.warn(
        '[Supabase] VITE_SUPABASE_URL does not look like a Supabase project URL:',
        supabaseUrl,
      )
    }
  } catch {
    console.error('[Supabase] VITE_SUPABASE_URL is not a valid URL:', supabaseUrl)
    return null
  }

  // Validate key is not empty/placeholder
  if (supabaseAnonKey.length < 20) {
    console.error('[Supabase] VITE_SUPABASE_ANON_KEY appears to be invalid (too short)')
    return null
  }

  return { url: supabaseUrl, key: supabaseAnonKey }
}

const validConfig = validateSupabaseConfig()
export const isSupabaseConfigured = !!validConfig

export const supabase: SupabaseClient | null = validConfig
  ? createClient(validConfig.url, validConfig.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: typeof window !== 'undefined',
    },
  })
  : null
