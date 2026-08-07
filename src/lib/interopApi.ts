import { isSupabaseConfigured, supabase } from './supabase'
import {
  checkNphiesEligibility,
  submitNphiesClaim,
  type NphiesEligibilityRequest,
  type NphiesEligibilityResponse,
  type NphiesClaimSubmitRequest,
  type NphiesClaimSubmitResponse,
} from './nphies'
import { decodeMllp, buildMllpAck, oruToLabHint } from './mllp'
import { dal } from './dal'

/** Ingest MLLP/HL7 via Edge when configured; otherwise local ORU→lab. */
export async function ingestMllpMessage(framedOrHl7: string): Promise<{
  ack: string
  labUpdated: number | null
  controlId: string
  stub: boolean
}> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke('mllp-ingest', {
      body: { message: framedOrHl7 },
    })
    if (!error && data?.ack) {
      return {
        ack: data.ack as string,
        labUpdated: (data.labUpdated as number | null) ?? null,
        controlId: (data.controlId as string) || '',
        stub: true,
      }
    }
  }

  const parsed = decodeMllp(framedOrHl7)
  const hint = oruToLabHint(parsed)
  let labUpdated: number | null = null
  if (hint) {
    labUpdated = await dal.ingestOruLabResult({
      patientId: hint.patientId,
      patientName: hint.patientName,
      testName: hint.testName,
      result: hint.result,
    })
  }
  return {
    ack: buildMllpAck(parsed, hint ? 'AA' : 'AE'),
    labUpdated,
    controlId: parsed.controlId,
    stub: true,
  }
}

export async function nphiesEligibility(
  req: NphiesEligibilityRequest,
): Promise<NphiesEligibilityResponse> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke('nphies', {
      body: { action: 'eligibility', ...req },
    })
    if (!error && data?.status) return data as NphiesEligibilityResponse
  }
  return checkNphiesEligibility(req)
}

export async function nphiesSubmitClaim(
  req: NphiesClaimSubmitRequest,
): Promise<NphiesClaimSubmitResponse> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke('nphies', {
      body: { action: 'submit', ...req },
    })
    if (!error && data?.status) return data as NphiesClaimSubmitResponse
  }
  return submitNphiesClaim(req)
}
