import { describe, expect, it } from 'vitest'
import { evaluateCds } from './cdsEngine'
import { SEED_DDI_RULES, SEED_ALLERGY_RULES } from './cdsSeed'
import { canPlaceOrder, countOpenOrders } from './cpoe'
import type { ClinicalOrder } from '../types'

const rules = { ddiRules: SEED_DDI_RULES, allergyRules: SEED_ALLERGY_RULES }

describe('cpoe', () => {
  it('detects penicillin class vs amoxicillin', () => {
    const alerts = evaluateCds({
      medicineName: 'Amoxicillin 500mg',
      activeMedications: [],
      allergies: ['Penicillin'],
      ...rules,
    })
    expect(alerts.some((a) => a.kind === 'allergy' && a.severity === 'major')).toBe(true)
  })

  it('allows unrelated medicine', () => {
    const alerts = evaluateCds({
      medicineName: 'Metformin 500mg',
      activeMedications: [],
      allergies: ['Penicillin'],
      ...rules,
    })
    expect(alerts.filter((a) => a.kind === 'allergy')).toEqual([])
  })

  it('validates place order input', () => {
    expect(canPlaceOrder({})).toBe('Patient required')
    expect(canPlaceOrder({ patientId: 1, orderType: 'lab', description: 'CBC' })).toBeNull()
    expect(canPlaceOrder({ patientId: 1, orderType: 'pharmacy', description: 'x' })).toBe(
      'Medicine required for pharmacy order',
    )
  })

  it('counts open orders', () => {
    const orders = [
      { status: 'ordered' },
      { status: 'completed' },
      { status: 'in-progress' },
    ] as ClinicalOrder[]
    expect(countOpenOrders(orders)).toBe(2)
  })
})
