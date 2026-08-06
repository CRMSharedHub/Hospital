import { describe, expect, it } from 'vitest'
import { checkDrugAllergyAlert, canPlaceOrder, countOpenOrders } from './cpoe'
import type { ClinicalOrder } from '../types'

describe('cpoe', () => {
  it('detects penicillin class vs amoxicillin', () => {
    const alert = checkDrugAllergyAlert('Amoxicillin 500mg', ['Penicillin'])
    expect(alert).toContain('allergy conflict')
  })

  it('allows unrelated medicine', () => {
    expect(checkDrugAllergyAlert('Metformin 500mg', ['Penicillin'])).toBeNull()
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
