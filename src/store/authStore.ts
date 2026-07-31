import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: '1',
        name: 'Admin User',
        email: 'admin@cityhospital.com',
        role: 'admin',
      },
      isAuthenticated: true, // Auto-login for prototyping
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
