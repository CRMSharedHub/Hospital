export type CdsSeverity = 'major' | 'moderate'
export type CdsKind = 'allergy' | 'drug_drug'

export interface CdsAlert {
  kind: CdsKind
  severity: CdsSeverity
  category: string
  messageEn: string
  messageAr: string
  actionEn: string
  actionAr: string
  withDrug?: string
  ruleId?: number
}

export interface CdsDrugInteractionRule {
  id?: number
  drugA: string
  drugB: string
  severity: CdsSeverity
  category: string
  messageEn: string
  messageAr: string
  actionEn: string
  actionAr: string
  active: boolean
}

export interface CdsAllergyRule {
  id?: number
  allergyKey: string
  drugMatchers: string[]
  severity: CdsSeverity
  category: string
  messageEn: string
  messageAr: string
  actionEn: string
  actionAr: string
  active: boolean
}
