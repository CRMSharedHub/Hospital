/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string
    readonly VITE_SUPABASE_ANON_KEY?: string
    readonly VITE_ERROR_ENDPOINT?: string
    readonly VITE_VAPID_PUBLIC_KEY?: string
    readonly VITE_ENCRYPTION_KEY?: string
    /** Opt-in local demo auth for prod builds / E2E — never with real PHI */
    readonly VITE_ALLOW_DEMO_AUTH?: string
    /** Skip MFA role enforcement — E2E only */
    readonly VITE_DISABLE_MFA?: string
    /** Prefer Edge Function encryption (default on when Supabase configured) */
    readonly VITE_USE_SERVER_ENCRYPTION?: string
    /** Allow client AES fallback if Edge Function fails — never with real PHI */
    readonly VITE_ALLOW_CLIENT_ENCRYPTION?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
