import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchConsentRecords, upsertAllConsentRecords, upsertConsentRecord } from '../lib/consentApi'

export type ConsentType = 'data_processing' | 'marketing' | 'analytics' | 'third_party_share'

export interface ConsentRecord {
  type: ConsentType
  granted: boolean
  timestamp: string
  version: string
}

interface ConsentState {
  consents: Partial<Record<ConsentType, ConsentRecord>>
  grant: (type: ConsentType) => void
  revoke: (type: ConsentType) => void
  hasConsent: (type: ConsentType) => boolean
  grantAll: () => void
  revokeAll: () => void
  /** Replace local map with server records (or merge). */
  hydrateFromServer: () => Promise<void>
  setConsents: (consents: Partial<Record<ConsentType, ConsentRecord>>) => void
}

const CONSENT_VERSION = '1.0.0'
const ALL_TYPES: ConsentType[] = ['data_processing', 'marketing', 'analytics', 'third_party_share']

function makeRecord(type: ConsentType, granted: boolean): ConsentRecord {
  return { type, granted, timestamp: new Date().toISOString(), version: CONSENT_VERSION }
}

function makeAll(granted: boolean): Record<ConsentType, ConsentRecord> {
  const consents = {} as Record<ConsentType, ConsentRecord>
  for (const type of ALL_TYPES) {
    consents[type] = makeRecord(type, granted)
  }
  return consents
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      consents: {},
      grant: (type) => {
        const record = makeRecord(type, true)
        set((state) => ({
          consents: { ...state.consents, [type]: record },
        }))
        void upsertConsentRecord(record)
      },
      revoke: (type) => {
        const record = makeRecord(type, false)
        set((state) => ({
          consents: { ...state.consents, [type]: record },
        }))
        void upsertConsentRecord(record)
      },
      hasConsent: (type) => get().consents[type]?.granted === true,
      grantAll: () => {
        const consents = makeAll(true)
        set({ consents })
        void upsertAllConsentRecords(consents)
      },
      revokeAll: () => {
        const consents = makeAll(false)
        set({ consents })
        void upsertAllConsentRecords(consents)
      },
      setConsents: (consents) => set({ consents }),
      hydrateFromServer: async () => {
        const remote = await fetchConsentRecords()
        if (Object.keys(remote).length === 0) {
          // Push local preferences up once the user signs in
          const local = get().consents
          if (Object.keys(local).length > 0) {
            void upsertAllConsentRecords(local)
          }
          return
        }
        set({ consents: { ...get().consents, ...remote } })
      },
    }),
    { name: 'consent-storage' },
  ),
)
