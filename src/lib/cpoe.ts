import type { ClinicalOrder, ClinicalOrderType, ClinicalOrderPriority } from '../types'

/** Simple drug–allergy heuristic for demo CPOE alerts */
const ALLERGY_DRUG_HINTS: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'ampicillin', 'penicillin', 'augmentin'],
  sulfa: ['sulfamethoxazole', 'sulfadiazine', 'bactrim', 'co-trimoxazole'],
  aspirin: ['aspirin', 'acetylsalicylic'],
}

export function checkDrugAllergyAlert(
  medicineName: string,
  allergies: string[] | undefined,
): string | null {
  if (!allergies?.length || !medicineName.trim()) return null
  const med = medicineName.toLowerCase()
  for (const allergy of allergies) {
    const a = allergy.toLowerCase()
    // Direct name overlap
    if (med.includes(a) || a.includes(med.split(/\s+/)[0] ?? '')) {
      return `Possible allergy conflict: patient allergy "${allergy}" vs ${medicineName}`
    }
    for (const [key, drugs] of Object.entries(ALLERGY_DRUG_HINTS)) {
      if (a.includes(key) && drugs.some((d) => med.includes(d))) {
        return `Possible allergy conflict: patient allergy "${allergy}" vs ${medicineName}`
      }
    }
  }
  return null
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
