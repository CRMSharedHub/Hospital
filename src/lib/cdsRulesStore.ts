import { db } from './db'
import { SEED_ALLERGY_RULES, SEED_DDI_RULES } from './cdsSeed'
import type { CdsAllergyRule, CdsDrugInteractionRule } from './cdsTypes'
import { isSupabaseConfigured, supabase } from './supabase'

const CACHE_TTL_MS = 60_000

export type ActiveCdsRules = {
  ddi: CdsDrugInteractionRule[]
  allergy: CdsAllergyRule[]
}

let cache: { at: number; data: ActiveCdsRules } | null = null

export function invalidateCdsRulesCache(): void {
  cache = null
}

function seedActiveRules(): ActiveCdsRules {
  return {
    ddi: SEED_DDI_RULES.filter((r) => r.active),
    allergy: SEED_ALLERGY_RULES.filter((r) => r.active),
  }
}

function stripSeedId<T extends { id?: number }>(rule: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = rule
  return rest
}

async function ensureDemoSeed(): Promise<void> {
  const [ddiCount, allergyCount] = await Promise.all([
    db.cdsDrugInteractions.count(),
    db.cdsAllergyRules.count(),
  ])
  if (ddiCount > 0 || allergyCount > 0) return

  await db.cdsDrugInteractions.bulkAdd(
    SEED_DDI_RULES.map((r) => stripSeedId(r) as CdsDrugInteractionRule),
  )
  await db.cdsAllergyRules.bulkAdd(
    SEED_ALLERGY_RULES.map((r) => stripSeedId(r) as CdsAllergyRule),
  )
}

function mapSupabaseDdi(row: Record<string, unknown>): CdsDrugInteractionRule {
  return {
    id: Number(row.id),
    drugA: String(row.drug_a),
    drugB: String(row.drug_b),
    severity: row.severity as CdsDrugInteractionRule['severity'],
    category: String(row.category),
    messageEn: String(row.message_en),
    messageAr: String(row.message_ar),
    actionEn: String(row.action_en),
    actionAr: String(row.action_ar),
    active: Boolean(row.active),
  }
}

function mapSupabaseAllergy(row: Record<string, unknown>): CdsAllergyRule {
  return {
    id: Number(row.id),
    allergyKey: String(row.allergy_key),
    drugMatchers: Array.isArray(row.drug_matchers)
      ? (row.drug_matchers as string[])
      : [],
    severity: row.severity as CdsAllergyRule['severity'],
    category: String(row.category),
    messageEn: String(row.message_en),
    messageAr: String(row.message_ar),
    actionEn: String(row.action_en),
    actionAr: String(row.action_ar),
    active: Boolean(row.active),
  }
}

function ddiToSupabaseRow(rule: CdsDrugInteractionRule) {
  return {
    ...(rule.id != null ? { id: rule.id } : {}),
    drug_a: rule.drugA,
    drug_b: rule.drugB,
    severity: rule.severity,
    category: rule.category,
    message_en: rule.messageEn,
    message_ar: rule.messageAr,
    action_en: rule.actionEn,
    action_ar: rule.actionAr,
    active: rule.active,
  }
}

function allergyToSupabaseRow(rule: CdsAllergyRule) {
  return {
    ...(rule.id != null ? { id: rule.id } : {}),
    allergy_key: rule.allergyKey,
    drug_matchers: rule.drugMatchers,
    severity: rule.severity,
    category: rule.category,
    message_en: rule.messageEn,
    message_ar: rule.messageAr,
    action_en: rule.actionEn,
    action_ar: rule.actionAr,
    active: rule.active,
  }
}

async function loadDemoActive(): Promise<ActiveCdsRules> {
  await ensureDemoSeed()
  const [ddi, allergy] = await Promise.all([
    db.cdsDrugInteractions.filter((r) => r.active).toArray(),
    db.cdsAllergyRules.filter((r) => r.active).toArray(),
  ])
  return { ddi, allergy }
}

async function loadSupabaseActive(): Promise<ActiveCdsRules> {
  if (!supabase) throw new Error('Supabase client unavailable')

  const [ddiRes, allergyRes] = await Promise.all([
    supabase.from('cds_drug_interactions').select('*').eq('active', true),
    supabase.from('cds_allergy_rules').select('*').eq('active', true),
  ])

  if (ddiRes.error) throw ddiRes.error
  if (allergyRes.error) throw allergyRes.error

  return {
    ddi: (ddiRes.data ?? []).map((row) => mapSupabaseDdi(row as Record<string, unknown>)),
    allergy: (allergyRes.data ?? []).map((row) =>
      mapSupabaseAllergy(row as Record<string, unknown>),
    ),
  }
}

export async function getActiveCdsRules(): Promise<ActiveCdsRules> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.data
  }

  let data: ActiveCdsRules
  try {
    data =
      isSupabaseConfigured && supabase
        ? await loadSupabaseActive()
        : await loadDemoActive()
  } catch (err) {
    console.warn('[cdsRulesStore] failed to load rules; using seed', err)
    data = seedActiveRules()
  }

  cache = { at: now, data }
  return data
}

export async function listCdsDrugInteractions(): Promise<CdsDrugInteractionRule[]> {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('cds_drug_interactions').select('*')
      if (error) throw error
      return (data ?? []).map((row) => mapSupabaseDdi(row as Record<string, unknown>))
    }
    await ensureDemoSeed()
    return db.cdsDrugInteractions.toArray()
  } catch (err) {
    console.warn('[cdsRulesStore] listCdsDrugInteractions failed; using seed', err)
    return [...SEED_DDI_RULES]
  }
}

export async function listCdsAllergyRules(): Promise<CdsAllergyRule[]> {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('cds_allergy_rules').select('*')
      if (error) throw error
      return (data ?? []).map((row) => mapSupabaseAllergy(row as Record<string, unknown>))
    }
    await ensureDemoSeed()
    return db.cdsAllergyRules.toArray()
  } catch (err) {
    console.warn('[cdsRulesStore] listCdsAllergyRules failed; using seed', err)
    return [...SEED_ALLERGY_RULES]
  }
}

export async function upsertCdsDrugInteraction(
  rule: CdsDrugInteractionRule,
): Promise<number> {
  try {
    if (isSupabaseConfigured && supabase) {
      const row = ddiToSupabaseRow(rule)
      const { data, error } = await supabase
        .from('cds_drug_interactions')
        .upsert(row)
        .select('id')
        .single()
      if (error) throw error
      invalidateCdsRulesCache()
      return Number(data.id)
    }

    await ensureDemoSeed()
    if (rule.id != null) {
      await db.cdsDrugInteractions.put(rule)
      invalidateCdsRulesCache()
      return rule.id
    }
    const id = await db.cdsDrugInteractions.add(stripSeedId(rule) as CdsDrugInteractionRule)
    invalidateCdsRulesCache()
    return id
  } catch (err) {
    console.warn('[cdsRulesStore] upsertCdsDrugInteraction failed', err)
    throw err
  }
}

export async function upsertCdsAllergyRule(rule: CdsAllergyRule): Promise<number> {
  try {
    if (isSupabaseConfigured && supabase) {
      const row = allergyToSupabaseRow(rule)
      const { data, error } = await supabase
        .from('cds_allergy_rules')
        .upsert(row)
        .select('id')
        .single()
      if (error) throw error
      invalidateCdsRulesCache()
      return Number(data.id)
    }

    await ensureDemoSeed()
    if (rule.id != null) {
      await db.cdsAllergyRules.put(rule)
      invalidateCdsRulesCache()
      return rule.id
    }
    const id = await db.cdsAllergyRules.add(stripSeedId(rule) as CdsAllergyRule)
    invalidateCdsRulesCache()
    return id
  } catch (err) {
    console.warn('[cdsRulesStore] upsertCdsAllergyRule failed', err)
    throw err
  }
}

export async function setCdsDrugInteractionActive(
  id: number,
  active: boolean,
): Promise<void> {
  try {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('cds_drug_interactions')
        .update({ active })
        .eq('id', id)
      if (error) throw error
      invalidateCdsRulesCache()
      return
    }

    await db.cdsDrugInteractions.update(id, { active })
    invalidateCdsRulesCache()
  } catch (err) {
    console.warn('[cdsRulesStore] setCdsDrugInteractionActive failed', err)
    throw err
  }
}

export async function setCdsAllergyRuleActive(
  id: number,
  active: boolean,
): Promise<void> {
  try {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('cds_allergy_rules')
        .update({ active })
        .eq('id', id)
      if (error) throw error
      invalidateCdsRulesCache()
      return
    }

    await db.cdsAllergyRules.update(id, { active })
    invalidateCdsRulesCache()
  } catch (err) {
    console.warn('[cdsRulesStore] setCdsAllergyRuleActive failed', err)
    throw err
  }
}
