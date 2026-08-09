/**
 * Drug–drug interaction stubs for CPOE (automatable CDS).
 * @deprecated Use cdsEngine.evaluateCds with injected rules.
 */

export type { CdsAlert, CdsSeverity } from './cdsTypes'
export {
  evaluateCds,
  requiresOverrideReason,
  requiresAcknowledge,
  formatCdsSummary,
  CdsAckRequiredError,
} from './cdsEngine'
export { SEED_DDI_RULES, SEED_ALLERGY_RULES } from './cdsSeed'

import { evaluateCds } from './cdsEngine'
import { SEED_DDI_RULES, SEED_ALLERGY_RULES } from './cdsSeed'

/** @deprecated Use CdsAlert from cdsTypes */
export interface DrugInteractionAlert {
  severity: 'major' | 'moderate'
  message: string
  withDrug: string
}

/** Check new medicine against active medication name list. */
export function checkDrugDrugInteractions(
  newMedicineName: string,
  activeMedications: string[],
): DrugInteractionAlert[] {
  const alerts = evaluateCds({
    medicineName: newMedicineName,
    activeMedications,
    allergies: [],
    ddiRules: SEED_DDI_RULES,
    allergyRules: SEED_ALLERGY_RULES,
  })
  return alerts
    .filter((a) => a.kind === 'drug_drug')
    .map((a) => ({
      severity: a.severity,
      message: a.messageEn,
      withDrug: a.withDrug ?? '',
    }))
}

export function formatDrugInteractionAlert(alerts: DrugInteractionAlert[]): string | null {
  if (!alerts.length) return null
  return alerts.map((a) => `[${a.severity}] ${a.message} (vs ${a.withDrug})`).join('; ')
}
