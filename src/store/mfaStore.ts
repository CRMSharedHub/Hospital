import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MFAState {
  /** Map of user ID → encrypted TOTP secret */
  secrets: Record<string, string>
  /** Users who have completed MFA setup */
  enrolled: string[]
  /** Users who have verified MFA in current session */
  verified: string[]
  enroll: (userId: string, secret: string) => void
  unenroll: (userId: string) => void
  isEnrolled: (userId: string) => boolean
  isVerified: (userId: string) => boolean
  setVerified: (userId: string) => void
  clearVerified: (userId: string) => void
  getSecret: (userId: string) => string | undefined
}

export const useMFAStore = create<MFAState>()(
  persist(
    (set, get) => ({
      secrets: {},
      enrolled: [],
      verified: [],
      enroll: (userId, secret) =>
        set((state) => ({
          secrets: { ...state.secrets, [userId]: secret },
          enrolled: [...state.enrolled.filter((id) => id !== userId), userId],
        })),
      unenroll: (userId) =>
        set((state) => {
          const rest = { ...state.secrets }
          delete rest[userId]
          return {
            secrets: rest,
            enrolled: state.enrolled.filter((id) => id !== userId),
            verified: state.verified.filter((id) => id !== userId),
          }
        }),
      isEnrolled: (userId) => get().enrolled.includes(userId),
      isVerified: (userId) => get().verified.includes(userId),
      setVerified: (userId) =>
        set((state) => ({
          verified: [...state.verified.filter((id) => id !== userId), userId],
        })),
      clearVerified: (userId) =>
        set((state) => ({
          verified: state.verified.filter((id) => id !== userId),
        })),
      getSecret: (userId) => get().secrets[userId],
    }),
    {
      name: 'mfa-storage',
      // Session verification must NOT persist across reloads
      partialize: (state) => ({
        secrets: state.secrets,
        enrolled: state.enrolled,
      }),
    },
  ),
)
