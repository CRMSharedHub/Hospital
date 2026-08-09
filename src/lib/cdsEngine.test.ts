import { describe, expect, it } from 'vitest'
import {
  evaluateCds,
  requiresOverrideReason,
  requiresAcknowledge,
  formatCdsSummary,
} from './cdsEngine'
import { SEED_DDI_RULES, SEED_ALLERGY_RULES } from './cdsSeed'

const rules = { ddiRules: SEED_DDI_RULES, allergyRules: SEED_ALLERGY_RULES }

describe('evaluateCds', () => {
  it('flags major warfarin + aspirin with bilingual fields and action', () => {
    const alerts = evaluateCds({
      medicineName: 'Aspirin 81mg',
      activeMedications: ['Warfarin 5mg'],
      allergies: [],
      ...rules,
    })
    const hit = alerts.find((a) => a.kind === 'drug_drug' && a.severity === 'major')
    expect(hit).toBeTruthy()
    expect(hit!.messageEn.toLowerCase()).toContain('bleeding')
    expect(hit!.messageAr.length).toBeGreaterThan(3)
    expect(hit!.actionEn.length).toBeGreaterThan(3)
    expect(hit!.category).toBe('bleeding')
  })

  it('flags penicillin allergy vs amoxicillin as major allergy requiring reason', () => {
    const alerts = evaluateCds({
      medicineName: 'Amoxicillin 500mg',
      activeMedications: [],
      allergies: ['penicillin'],
      ...rules,
    })
    expect(alerts.some((a) => a.kind === 'allergy' && a.severity === 'major')).toBe(true)
    expect(requiresOverrideReason(alerts)).toBe(true)
  })

  it('moderate-only DDI requires acknowledge but not override reason', () => {
    const alerts = evaluateCds({
      medicineName: 'Iodinated contrast',
      activeMedications: ['Metformin 500mg'],
      allergies: [],
      ...rules,
    })
    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts.every((a) => a.severity === 'moderate')).toBe(true)
    expect(requiresAcknowledge(alerts)).toBe(true)
    expect(requiresOverrideReason(alerts)).toBe(false)
  })

  it('formatCdsSummary picks locale', () => {
    const alerts = evaluateCds({
      medicineName: 'Aspirin',
      activeMedications: ['Warfarin'],
      allergies: [],
      ...rules,
    })
    const en = formatCdsSummary(alerts, 'en')!
    const ar = formatCdsSummary(alerts, 'ar')!
    expect(en).not.toEqual(ar)
  })

  it('ignores inactive DDI rules', () => {
    const inactiveDdi = SEED_DDI_RULES.map((r) =>
      r.drugA === 'warfarin' && r.drugB === 'aspirin' ? { ...r, active: false } : r,
    )
    const alerts = evaluateCds({
      medicineName: 'Aspirin 81mg',
      activeMedications: ['Warfarin 5mg'],
      allergies: [],
      ddiRules: inactiveDdi,
      allergyRules: SEED_ALLERGY_RULES,
    })
    expect(alerts.some((a) => a.kind === 'drug_drug' && a.ruleId === -1)).toBe(false)
  })

  it('moderate allergy still requires override reason because kind is allergy', () => {
    const alerts = evaluateCds({
      medicineName: 'Latex-containing syringe',
      activeMedications: [],
      allergies: ['latex'],
      ...rules,
    })
    const latex = alerts.find((a) => a.kind === 'allergy' && a.ruleId === -106)
    expect(latex).toBeTruthy()
    expect(latex!.severity).toBe('moderate')
    expect(requiresOverrideReason(alerts)).toBe(true)
  })
})
