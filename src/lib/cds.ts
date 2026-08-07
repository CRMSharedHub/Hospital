/**
 * Drug–drug interaction stubs for CPOE (automatable CDS).
 */

/** Pairs are unordered; either drug name substring triggers. */
const INTERACTION_PAIRS: { a: string; b: string; severity: 'major' | 'moderate'; message: string }[] = [
  {
    a: 'warfarin',
    b: 'aspirin',
    severity: 'major',
    message: 'Increased bleeding risk (warfarin + aspirin)',
  },
  {
    a: 'warfarin',
    b: 'ibuprofen',
    severity: 'major',
    message: 'Increased bleeding risk (warfarin + NSAID)',
  },
  {
    a: 'metformin',
    b: 'contrast',
    severity: 'moderate',
    message: 'Hold metformin around iodinated contrast when applicable',
  },
  {
    a: 'simvastatin',
    b: 'clarithromycin',
    severity: 'major',
    message: 'Statin + clarithromycin — myopathy risk',
  },
  {
    a: 'ssri',
    b: 'tramadol',
    severity: 'major',
    message: 'Serotonin syndrome risk (SSRI + tramadol)',
  },
  {
    a: 'fluoxetine',
    b: 'tramadol',
    severity: 'major',
    message: 'Serotonin syndrome risk (fluoxetine + tramadol)',
  },
  {
    a: 'ace inhibitor',
    b: 'potassium',
    severity: 'moderate',
    message: 'Hyperkalemia risk (ACEI + potassium)',
  },
  {
    a: 'digoxin',
    b: 'amiodarone',
    severity: 'major',
    message: 'Digoxin level may rise with amiodarone — monitor',
  },
  {
    a: 'methotrexate',
    b: 'nsaid',
    severity: 'major',
    message: 'Methotrexate + NSAID — toxicity risk',
  },
  {
    a: 'methotrexate',
    b: 'ibuprofen',
    severity: 'major',
    message: 'Methotrexate + ibuprofen — toxicity risk',
  },
]

function norm(s: string): string {
  return s.toLowerCase()
}

function matchesDrug(haystack: string, needle: string): boolean {
  const h = norm(haystack)
  const n = norm(needle)
  return h.includes(n) || n.split(/\s+/).some((p) => p.length > 3 && h.includes(p))
}

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
  if (!newMedicineName.trim() || !activeMedications.length) return []
  const alerts: DrugInteractionAlert[] = []
  for (const existing of activeMedications) {
    for (const pair of INTERACTION_PAIRS) {
      const newMatchesA = matchesDrug(newMedicineName, pair.a)
      const newMatchesB = matchesDrug(newMedicineName, pair.b)
      const oldMatchesA = matchesDrug(existing, pair.a)
      const oldMatchesB = matchesDrug(existing, pair.b)
      if ((newMatchesA && oldMatchesB) || (newMatchesB && oldMatchesA)) {
        alerts.push({
          severity: pair.severity,
          message: pair.message,
          withDrug: existing,
        })
      }
    }
  }
  // Dedupe by message
  const seen = new Set<string>()
  return alerts.filter((a) => {
    if (seen.has(a.message)) return false
    seen.add(a.message)
    return true
  })
}

export function formatDrugInteractionAlert(alerts: DrugInteractionAlert[]): string | null {
  if (!alerts.length) return null
  return alerts.map((a) => `[${a.severity}] ${a.message} (vs ${a.withDrug})`).join('; ')
}
