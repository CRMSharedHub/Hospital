/**
 * NPHIES / CHI-style eligibility + claim submit stubs (Saudi Arabia market).
 * Mock-only — no live NPHIES credentials. Safe for demo/E2E.
 */

export type NphiesEligibilityStatus = 'eligible' | 'ineligible' | 'unknown'

export interface NphiesEligibilityRequest {
  nationalId: string
  payerId?: string
  memberId?: string
  serviceDate?: string
}

export interface NphiesEligibilityResponse {
  status: NphiesEligibilityStatus
  payerName: string
  coveragePercent: number
  memberId: string
  policyNumber: string
  message: string
  stub: true
}

export interface NphiesClaimSubmitRequest {
  claimId: number
  patientNationalId: string
  payerId?: string
  icd10Codes: string[]
  cptCodes: string[]
  total: number
  currency?: string
}

export interface NphiesClaimSubmitResponse {
  submissionId: string
  status: 'accepted' | 'rejected' | 'pending'
  externalRef: string
  message: string
  stub: true
}

function hashStub(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Mock eligibility check — odd national IDs ineligible for demo variety. */
export function checkNphiesEligibility(
  req: NphiesEligibilityRequest,
): NphiesEligibilityResponse {
  const id = req.nationalId.replace(/\D/g, '')
  if (id.length < 5) {
    return {
      status: 'unknown',
      payerName: req.payerId || 'NPHIES Mock Payer',
      coveragePercent: 0,
      memberId: req.memberId || '',
      policyNumber: '',
      message: 'National ID too short for eligibility stub',
      stub: true,
    }
  }
  const ineligible = Number(id.slice(-1)) % 2 === 1 && id.endsWith('9')
  if (ineligible) {
    return {
      status: 'ineligible',
      payerName: req.payerId || 'NPHIES Mock Payer',
      coveragePercent: 0,
      memberId: req.memberId || `MEM-${id.slice(-6)}`,
      policyNumber: '',
      message: 'Coverage not active (mock)',
      stub: true,
    }
  }
  const coverage = 70 + (hashStub(id) % 30)
  return {
    status: 'eligible',
    payerName: req.payerId || 'NPHIES Mock Payer',
    coveragePercent: coverage,
    memberId: req.memberId || `MEM-${id.slice(-6)}`,
    policyNumber: `POL-${hashStub(id).toString(16).toUpperCase().slice(0, 8)}`,
    message: 'Eligible under mock NPHIES coverage',
    stub: true,
  }
}

/** Mock claim submission to NPHIES clearinghouse. */
export function submitNphiesClaim(req: NphiesClaimSubmitRequest): NphiesClaimSubmitResponse {
  if (!req.icd10Codes.length || !req.cptCodes.length) {
    return {
      submissionId: '',
      status: 'rejected',
      externalRef: '',
      message: 'ICD-10 and CPT codes required',
      stub: true,
    }
  }
  const submissionId = `NPH-${req.claimId}-${Date.now()}`
  const reject = req.total <= 0
  return {
    submissionId: reject ? '' : submissionId,
    status: reject ? 'rejected' : 'accepted',
    externalRef: reject ? '' : submissionId,
    message: reject ? 'Invalid claim total' : 'Accepted by NPHIES mock gateway',
    stub: true,
  }
}
