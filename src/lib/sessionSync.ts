import { supabase, isSupabaseConfigured } from './supabase'
import { isDemoAuthAllowed } from './runtimeConfig'
import { useAuthStore } from '../store/authStore'
import { useConsentStore } from '../store/consentStore'
import { getServerMfaStatus, usesServerMfa } from './supabaseMfa'
import { isMFARequired } from './mfa'
import type { User } from '../types'

export function requiresServerSession(): boolean {
  return isSupabaseConfigured && !!supabase
}

function profileToUser(profile: {
  id: string
  name: string
  email: string
  role: User['role']
  avatar?: string | null
  linked_patient_id?: number | null
}): User {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    avatar: profile.avatar ?? undefined,
    linkedPatientId: profile.linked_patient_id ?? undefined,
  }
}

type AuthChangeHandler = (
  event: string,
  session: { user?: { id: string }; expires_at?: number } | null,
) => void

let authListenerAttached = false
let onTokenRefresh: ((expiresAt: number | undefined) => void) | null = null
let onSignedOut: (() => void) | null = null

/** Optional hooks used by entry-client for refresh timer / query cache. */
export function configureSessionSyncHooks(hooks: {
  onTokenRefresh?: (expiresAt: number | undefined) => void
  onSignedOut?: () => void
}): void {
  onTokenRefresh = hooks.onTokenRefresh ?? null
  onSignedOut = hooks.onSignedOut ?? null
}

async function loadProfile(userId: string): Promise<User | null> {
  if (!supabase) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (!profile) return null
  return profileToUser(profile)
}

async function syncMfaFlag(user: User): Promise<void> {
  if (!isMFARequired(user.role) || import.meta.env.VITE_DISABLE_MFA === 'true') {
    useAuthStore.getState().markMfaVerified(true)
    return
  }
  if (!usesServerMfa()) {
    return
  }
  try {
    const status = await getServerMfaStatus()
    useAuthStore.getState().markMfaVerified(status.verified)
  } catch {
    useAuthStore.getState().markMfaVerified(false)
  }
}

function attachAuthListener(): void {
  if (!supabase || authListenerAttached) return
  authListenerAttached = true

  const handler: AuthChangeHandler = async (event, session) => {
    if (event === 'TOKEN_REFRESHED' && session) {
      onTokenRefresh?.(session.expires_at)
      useAuthStore.getState().markSessionBound(true)
      const user = useAuthStore.getState().user
      if (user) await syncMfaFlag(user)
      return
    }

    if (event === 'SIGNED_OUT' || !session?.user) {
      useAuthStore.getState().clearLocalAuth()
      useAuthStore.getState().markSessionReady(true)
      onSignedOut?.()
      return
    }

    const user = await loadProfile(session.user.id)
    if (user) {
      useAuthStore.getState().login(user, { sessionBound: true, mfaVerified: false })
      await syncMfaFlag(user)
      void useConsentStore.getState().hydrateFromServer()
      onTokenRefresh?.(session.expires_at)
    } else {
      useAuthStore.getState().clearLocalAuth()
    }
  }

  supabase.auth.onAuthStateChange((event, session) => {
    void handler(event, session)
  })
}

/**
 * Bind Zustand auth to a live Supabase session when configured.
 * Clears forged localStorage auth if no server session exists.
 */
export async function syncAuthWithServerSession(): Promise<void> {
  const store = useAuthStore.getState()

  if (!requiresServerSession()) {
    if (!isDemoAuthAllowed()) {
      store.clearLocalAuth()
      store.markSessionReady(true)
      return
    }
    store.markSessionBound(store.isAuthenticated)
    store.markSessionReady(true)
    return
  }

  attachAuthListener()

  const { data, error } = await supabase!.auth.getSession()
  if (error || !data.session?.user) {
    store.clearLocalAuth()
    store.markSessionReady(true)
    return
  }

  const user = await loadProfile(data.session.user.id)
  if (!user) {
    store.clearLocalAuth()
    store.markSessionReady(true)
    return
  }

  store.login(user, { sessionBound: true, mfaVerified: false })
  await syncMfaFlag(user)
  void useConsentStore.getState().hydrateFromServer()
  onTokenRefresh?.(data.session.expires_at)
}

/**
 * Re-check session on protected navigation.
 * Returns false when Supabase is required but no live session exists.
 */
export async function assertServerSession(): Promise<boolean> {
  if (!requiresServerSession()) {
    return isDemoAuthAllowed()
  }

  const { data, error } = await supabase!.auth.getSession()
  if (error || !data.session?.user) {
    useAuthStore.getState().clearLocalAuth()
    useAuthStore.getState().markSessionReady(true)
    return false
  }

  useAuthStore.getState().markSessionBound(true)
  useAuthStore.getState().markSessionReady(true)
  const user = useAuthStore.getState().user
  if (user) await syncMfaFlag(user)
  return true
}
