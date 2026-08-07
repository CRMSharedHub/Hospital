import { supabase, isSupabaseConfigured } from './supabase'

export function usesServerMfa(): boolean {
  return isSupabaseConfigured && !!supabase && import.meta.env.VITE_DISABLE_MFA !== 'true'
}

export interface ServerMfaStatus {
  enrolled: boolean
  verified: boolean
  factorId: string | null
  currentLevel: string | null
  nextLevel: string | null
}

export async function getServerMfaStatus(): Promise<ServerMfaStatus> {
  if (!supabase) {
    return { enrolled: false, verified: false, factorId: null, currentLevel: null, nextLevel: null }
  }

  const [{ data: aal, error: aalError }, { data: factors, error: factorsError }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])

  if (aalError) throw aalError
  if (factorsError) throw factorsError

  const totp = factors?.totp?.[0] ?? null
  const currentLevel = aal?.currentLevel ?? null
  const nextLevel = aal?.nextLevel ?? null
  const verified = currentLevel === 'aal2'

  return {
    enrolled: !!totp,
    verified,
    factorId: totp?.id ?? null,
    currentLevel,
    nextLevel,
  }
}

export interface EnrollTotpResult {
  factorId: string
  secret: string
  qrCode: string
  uri: string
}

/** Start TOTP enrollment — returns secret + QR (SVG data URL from Supabase). */
export async function enrollServerTotp(friendlyName = 'Hospital360'): Promise<EnrollTotpResult> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  })
  if (error) throw error
  if (!data?.id || !data.totp?.secret) throw new Error('MFA enroll returned incomplete data')

  return {
    factorId: data.id,
    secret: data.totp.secret,
    qrCode: data.totp.qr_code,
    uri: data.totp.uri,
  }
}

/** Verify first-time enrollment code (activates the factor). */
export async function verifyServerEnrollment(factorId: string, code: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  const challenge = await supabase.auth.mfa.challenge({ factorId })
  if (challenge.error) throw challenge.error
  if (!challenge.data?.id) throw new Error('MFA challenge failed')

  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  })
  if (verify.error) throw verify.error
}

/** Challenge + verify an already-enrolled factor (login step-up to AAL2). */
export async function challengeAndVerifyServerMfa(factorId: string, code: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw error
}

/** Resolve the first verified TOTP factor id, if any. */
export async function getVerifiedTotpFactorId(): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  return data?.totp?.[0]?.id ?? null
}
