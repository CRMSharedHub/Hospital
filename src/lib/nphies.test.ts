import { describe, expect, it } from 'vitest'
import { checkNphiesEligibility, submitNphiesClaim } from './nphies'

describe('nphies stubs', () => {
  it('returns eligible for typical national id', () => {
    const res = checkNphiesEligibility({ nationalId: '1234567890' })
    expect(res.stub).toBe(true)
    expect(res.status).toBe('eligible')
    expect(res.coveragePercent).toBeGreaterThan(0)
  })

  it('rejects claim without codes', () => {
    const res = submitNphiesClaim({
      claimId: 1,
      patientNationalId: '1234567890',
      icd10Codes: [],
      cptCodes: ['99213'],
      total: 100,
    })
    expect(res.status).toBe('rejected')
  })

  it('accepts valid claim stub', () => {
    const res = submitNphiesClaim({
      claimId: 5,
      patientNationalId: '1234567890',
      icd10Codes: ['I10'],
      cptCodes: ['99213'],
      total: 250,
    })
    expect(res.status).toBe('accepted')
    expect(res.externalRef).toMatch(/^NPH-5-/)
  })
})
