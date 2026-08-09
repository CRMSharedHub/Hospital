import { describe, expect, it } from 'vitest'
import { evaluateCds, formatCdsSummary } from './cdsEngine'
import { SEED_DDI_RULES, SEED_ALLERGY_RULES } from './cdsSeed'
import { checkDrugDrugInteractions, formatDrugInteractionAlert } from './cds'

const rules = { ddiRules: SEED_DDI_RULES, allergyRules: SEED_ALLERGY_RULES }

describe('cds drug–drug', () => {
  it('flags warfarin + aspirin', () => {
    const alerts = checkDrugDrugInteractions('Aspirin 81mg', ['Warfarin 5mg'])
    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts[0]?.severity).toBe('major')
    expect(formatDrugInteractionAlert(alerts)).toContain('bleeding')
  })

  it('returns empty when no conflict', () => {
    expect(checkDrugDrugInteractions('Paracetamol', ['Vitamin D'])).toEqual([])
  })

  it('engine smoke: evaluateCds with seed rules', () => {
    const alerts = evaluateCds({
      medicineName: 'Aspirin 81mg',
      activeMedications: ['Warfarin 5mg'],
      allergies: [],
      ...rules,
    })
    expect(alerts.length).toBeGreaterThan(0)
    expect(formatCdsSummary(alerts, 'en')).toContain('bleeding')
  })
})
