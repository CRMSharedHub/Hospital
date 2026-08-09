import type { CdsAlert, CdsAllergyRule, CdsDrugInteractionRule } from './cdsTypes'

function norm(s: string): string {
  return s.toLowerCase()
}

function matchesDrug(haystack: string, needle: string): boolean {
  const h = norm(haystack)
  const n = norm(needle)
  return h.includes(n) || n.split(/\s+/).some((p) => p.length > 3 && h.includes(p))
}

function dedupeKey(alert: CdsAlert): string {
  return `${alert.kind}|${alert.messageEn}|${alert.withDrug ?? ''}`
}

function checkDirectAllergyOverlap(
  medicineName: string,
  allergies: string[],
): CdsAlert[] {
  if (!allergies.length || !medicineName.trim()) return []
  const med = norm(medicineName)
  const alerts: CdsAlert[] = []
  for (const allergy of allergies) {
    const a = norm(allergy)
    if (
      med.includes(a) ||
      a.includes(med.split(/\s+/)[0] ?? '')
    ) {
      alerts.push({
        kind: 'allergy',
        severity: 'major',
        category: 'allergy_direct',
        messageEn: `Possible allergy conflict: patient allergy "${allergy}" vs ${medicineName}`,
        messageAr: `احتمال تعارض حساسية: حساسية المريض "${allergy}" مقابل ${medicineName}`,
        actionEn: 'Review allergy history; do not order without override reason',
        actionAr: 'راجع تاريخ الحساسية؛ لا تُصدر الطلب بدون سبب تجاوز',
      })
    }
  }
  return alerts
}

function checkAllergyRules(
  medicineName: string,
  allergies: string[],
  allergyRules: CdsAllergyRule[],
): CdsAlert[] {
  if (!allergies.length || !medicineName.trim()) return []
  const med = norm(medicineName)
  const alerts: CdsAlert[] = []
  for (const allergy of allergies) {
    const a = norm(allergy)
    for (const rule of allergyRules) {
      if (!rule.active) continue
      if (!a.includes(norm(rule.allergyKey))) continue
      if (!rule.drugMatchers.some((d) => med.includes(norm(d)))) continue
      alerts.push({
        kind: 'allergy',
        severity: rule.severity,
        category: rule.category,
        messageEn: rule.messageEn,
        messageAr: rule.messageAr,
        actionEn: rule.actionEn,
        actionAr: rule.actionAr,
        ruleId: rule.id,
      })
    }
  }
  return alerts
}

function checkDrugDrugInteractions(
  medicineName: string,
  activeMedications: string[],
  ddiRules: CdsDrugInteractionRule[],
): CdsAlert[] {
  if (!medicineName.trim() || !activeMedications.length) return []
  const alerts: CdsAlert[] = []
  for (const existing of activeMedications) {
    for (const rule of ddiRules) {
      if (!rule.active) continue
      const newMatchesA = matchesDrug(medicineName, rule.drugA)
      const newMatchesB = matchesDrug(medicineName, rule.drugB)
      const oldMatchesA = matchesDrug(existing, rule.drugA)
      const oldMatchesB = matchesDrug(existing, rule.drugB)
      if ((newMatchesA && oldMatchesB) || (newMatchesB && oldMatchesA)) {
        alerts.push({
          kind: 'drug_drug',
          severity: rule.severity,
          category: rule.category,
          messageEn: rule.messageEn,
          messageAr: rule.messageAr,
          actionEn: rule.actionEn,
          actionAr: rule.actionAr,
          withDrug: existing,
          ruleId: rule.id,
        })
      }
    }
  }
  return alerts
}

export function evaluateCds(input: {
  medicineName: string
  allergies?: string[]
  activeMedications: string[]
  ddiRules: CdsDrugInteractionRule[]
  allergyRules: CdsAllergyRule[]
}): CdsAlert[] {
  const allergies = input.allergies ?? []
  const raw = [
    ...checkDirectAllergyOverlap(input.medicineName, allergies),
    ...checkAllergyRules(input.medicineName, allergies, input.allergyRules),
    ...checkDrugDrugInteractions(input.medicineName, input.activeMedications, input.ddiRules),
  ]
  const seen = new Set<string>()
  return raw.filter((a) => {
    const key = dedupeKey(a)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function requiresOverrideReason(alerts: CdsAlert[]): boolean {
  return alerts.some((a) => a.kind === 'allergy' || a.severity === 'major')
}

export function requiresAcknowledge(alerts: CdsAlert[]): boolean {
  return alerts.length > 0
}

export function formatCdsSummary(alerts: CdsAlert[], locale: 'en' | 'ar'): string | null {
  if (!alerts.length) return null
  const isAr = locale === 'ar'
  return alerts
    .map((a) => {
      const msg = isAr ? a.messageAr : a.messageEn
      const suffix = a.withDrug ? (isAr ? ` (مقابل ${a.withDrug})` : ` (vs ${a.withDrug})`) : ''
      return `[${a.severity}] ${msg}${suffix}`
    })
    .join('; ')
}

export class CdsAckRequiredError extends Error {
  readonly alerts: CdsAlert[]

  constructor(alerts: CdsAlert[], message = 'CDS acknowledgment required') {
    super(message)
    this.name = 'CdsAckRequiredError'
    this.alerts = alerts
  }
}
