import { describe, expect, it } from 'vitest'
import { checkDrugDrugInteractions, formatDrugInteractionAlert } from './cds'

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
})
