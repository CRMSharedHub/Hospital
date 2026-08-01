import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

/**
 * DEMO-ONLY AUTHENTICATION.
 *
 * This store holds an identity in browser storage and nothing more. It provides
 * no security: there is no server, no session, no password verification beyond a
 * hardcoded local comparison, and every record lives unencrypted in IndexedDB on
 * the client. Anyone with access to the browser can read or edit all data.
 *
 * Real authentication (server-side sessions, hashed credentials, RBAC, audit
 * logging) is Phase 1 work and MUST land before any real patient data is
 * entered.
 */
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      version: 2,
      // v1 shipped an auto-logged-in admin. Drop any of that persisted state.
      migrate: () => ({ user: null, isAuthenticated: false }),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
