import { supabase, isSupabaseConfigured } from './supabase'
import type { ConsentRecord, ConsentType } from '../store/consentStore'

const CONSENT_TYPES: ConsentType[] = [
  'data_processing',
  'marketing',
  'analytics',
  'third_party_share',
]

type ConsentRow = {
  consent_type: ConsentType
  granted: boolean
  version: string
  recorded_at: string
}

export function usesServerConsent(): boolean {
  return isSupabaseConfigured && !!supabase
}

/** Persist a single consent change to Supabase when the user is signed in. */
export async function upsertConsentRecord(record: ConsentRecord): Promise<void> {
  if (!usesServerConsent() || !supabase?.auth?.getUser) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('consent_records').upsert(
      {
        user_id: user.id,
        consent_type: record.type,
        granted: record.granted,
        version: record.version,
        recorded_at: record.timestamp,
      },
      { onConflict: 'user_id,consent_type' },
    )

    if (error && import.meta.env.DEV) {
      console.warn('[consentApi] upsert failed', error.message)
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[consentApi] upsert error', err)
    }
  }
}

export async function upsertAllConsentRecords(
  consents: Partial<Record<ConsentType, ConsentRecord>>,
): Promise<void> {
  for (const type of CONSENT_TYPES) {
    const record = consents[type]
    if (record) await upsertConsentRecord(record)
  }
}

/** Load server consents and merge into a map (server wins). */
export async function fetchConsentRecords(): Promise<Partial<Record<ConsentType, ConsentRecord>>> {
  if (!usesServerConsent() || !supabase?.auth?.getUser) return {}

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}

    const { data, error } = await supabase
      .from('consent_records')
      .select('consent_type, granted, version, recorded_at')
      .eq('user_id', user.id)

    if (error || !data) {
      if (error && import.meta.env.DEV) {
        console.warn('[consentApi] fetch failed', error.message)
      }
      return {}
    }

    const out: Partial<Record<ConsentType, ConsentRecord>> = {}
    for (const row of data as ConsentRow[]) {
      out[row.consent_type] = {
        type: row.consent_type,
        granted: row.granted,
        version: row.version,
        timestamp: row.recorded_at,
      }
    }
    return out
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[consentApi] fetch error', err)
    }
    return {}
  }
}
