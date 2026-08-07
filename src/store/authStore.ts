import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  /** False until syncAuthWithServerSession (or demo bootstrap) completes. */
  sessionReady: boolean
  /** True only when auth is backed by a live server session (or allowed demo login). */
  sessionBound: boolean
  /**
   * MFA satisfied for this browser session.
   * Supabase: AAL2. Demo: local TOTP verify. Not persisted.
   */
  mfaVerified: boolean
  login: (user: User, options?: { sessionBound?: boolean; mfaVerified?: boolean }) => void
  logout: () => Promise<void>
  clearLocalAuth: () => void
  markSessionReady: (ready: boolean) => void
  markSessionBound: (bound: boolean) => void
  markMfaVerified: (verified: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      sessionReady: false,
      sessionBound: false,
      mfaVerified: false,
      login: (user, options) =>
        set({
          user,
          isAuthenticated: true,
          sessionBound: options?.sessionBound ?? true,
          sessionReady: true,
          mfaVerified: options?.mfaVerified ?? false,
        }),
      clearLocalAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          sessionBound: false,
          mfaVerified: false,
        }),
      markSessionReady: (ready) => set({ sessionReady: ready }),
      markSessionBound: (bound) => set({ sessionBound: bound }),
      markMfaVerified: (verified) => set({ mfaVerified: verified }),
      logout: async () => {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut()
        }
        set({
          user: null,
          isAuthenticated: false,
          sessionBound: false,
          mfaVerified: false,
          sessionReady: true,
        })
      },
    }),
    {
      name: 'auth-storage',
      version: 4,
      migrate: () => ({
        user: null,
        isAuthenticated: false,
        sessionReady: false,
        sessionBound: false,
        mfaVerified: false,
      }),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
