import type { ClinicalOrder, ClinicalOrderType, ClinicalOrderPriority } from '../types'
import { evaluateCds } from './cdsEngine'
import { SEED_DDI_RULES, SEED_ALLERGY_RULES } from './cdsSeed'

/** @deprecated Use evaluateCds from cdsEngine */
export function checkDrugAllergyAlert(
  medicineName: string,
  allergies: string[] | undefined,
): string | null {
  const alerts = evaluateCds({
    medicineName,
    activeMedications: [],
    allergies: allergies ?? [],
    ddiRules: SEED_DDI_RULES,
    allergyRules: SEED_ALLERGY_RULES,
  })
  const allergy = alerts.find((a) => a.kind === 'allergy')
  return allergy?.messageEn ?? null
}

export function canPlaceOrder(input: {
  patientId?: number
  description?: string
  orderType?: ClinicalOrderType
  medicineId?: number
}): string | null {
  if (!input.patientId) return 'Patient required'
  if (!input.orderType) return 'Order type required'
  if (!input.description?.trim()) return 'Order description required'
  if (input.orderType === 'pharmacy' && !input.medicineId) return 'Medicine required for pharmacy order'
  return null
}

export function orderStatusLabel(status: ClinicalOrder['status']): string {
  return status
}

export function defaultPriority(orderType: ClinicalOrderType): ClinicalOrderPriority {
  return orderType === 'imaging' ? 'routine' : 'routine'
}

export function countOpenOrders(orders: ClinicalOrder[]): number {
  return orders.filter((o) => o.status === 'ordered' || o.status === 'in-progress' || o.status === 'draft').length
}
