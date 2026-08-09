import { describe, expect, it } from 'vitest'
import {
  assertCdsPlacementAllowed,
  evaluateCds,
  CdsAckRequiredError,
} from './cdsEngine'
import { SEED_DDI_RULES, SEED_ALLERGY_RULES } from './cdsSeed'

const rules = { ddiRules: SEED_DDI_RULES, allergyRules: SEED_ALLERGY_RULES }

function warfarinAspirinAlerts() {
  return evaluateCds({
    medicineName: 'Aspirin 81mg',
    activeMedications: ['Warfarin 5mg'],
    allergies: [],
    ...rules,
  })
}

function moderateOnlyAlerts() {
  return evaluateCds({
    medicineName: 'Iodinated contrast',
    activeMedications: ['Metformin 500mg'],
    allergies: [],
    ...rules,
  })
}

describe('assertCdsPlacementAllowed', () => {
  it('allows placement when there are no alerts', () => {
    expect(() => assertCdsPlacementAllowed([], {})).not.toThrow()
  })

  it('throws CdsAckRequiredError when alerts exist and not acknowledged', () => {
    const alerts = warfarinAspirinAlerts()
    expect(alerts.length).toBeGreaterThan(0)
    try {
      assertCdsPlacementAllowed(alerts, {})
      expect.fail('expected CdsAckRequiredError')
    } catch (e) {
      expect(e).toBeInstanceOf(CdsAckRequiredError)
      expect((e as CdsAckRequiredError).alerts).toEqual(alerts)
    }
  })

  it('rejects major without reason even if acknowledged', () => {
    const alerts = warfarinAspirinAlerts()
    expect(() =>
      assertCdsPlacementAllowed(alerts, { acknowledgeCds: true, cdsOverrideReason: 'no' }),
    ).toThrow(/override reason/i)
  })

  it('allows major when acknowledged with reason >= 5 chars', () => {
    const alerts = warfarinAspirinAlerts()
    expect(() =>
      assertCdsPlacementAllowed(alerts, {
        acknowledgeCds: true,
        cdsOverrideReason: 'monitored',
      }),
    ).not.toThrow()
  })

  it('allows moderate-only DDI with acknowledge and no reason', () => {
    const alerts = moderateOnlyAlerts()
    expect(alerts.every((a) => a.severity === 'moderate')).toBe(true)
    expect(() =>
      assertCdsPlacementAllowed(alerts, { acknowledgeCds: true }),
    ).not.toThrow()
  })

  it('trims override reason before length check', () => {
    const alerts = warfarinAspirinAlerts()
    expect(() =>
      assertCdsPlacementAllowed(alerts, {
        acknowledgeCds: true,
        cdsOverrideReason: '  ab  ',
      }),
    ).toThrow(/override reason/i)
  })
})
