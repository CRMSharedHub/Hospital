import { describe, expect, it, beforeEach } from 'vitest'
import {
  getActiveCdsRules,
  invalidateCdsRulesCache,
  listCdsDrugInteractions,
  setCdsDrugInteractionActive,
} from './cdsRulesStore'
import { evaluateCds } from './cdsEngine'
import { SEED_DDI_RULES } from './cdsSeed'

describe('cdsRulesStore', () => {
  beforeEach(() => invalidateCdsRulesCache())

  it('returns seed rules when supabase is not configured', async () => {
    const { ddi, allergy } = await getActiveCdsRules()
    expect(ddi.length).toBeGreaterThanOrEqual(SEED_DDI_RULES.filter((r) => r.active).length)
    expect(allergy.length).toBeGreaterThan(0)
  })

  it('deactivated seed rule is omitted from active set after upsert in demo', async () => {
    const listed = await listCdsDrugInteractions()
    const warfarinAspirin = listed.find(
      (r) =>
        r.drugA.toLowerCase() === 'warfarin' && r.drugB.toLowerCase() === 'aspirin',
    )
    expect(warfarinAspirin?.id).toBeDefined()

    await setCdsDrugInteractionActive(warfarinAspirin!.id!, false)
    invalidateCdsRulesCache()

    const { ddi, allergy } = await getActiveCdsRules()
    expect(
      ddi.some(
        (r) =>
          r.drugA.toLowerCase() === 'warfarin' && r.drugB.toLowerCase() === 'aspirin',
      ),
    ).toBe(false)

    const alerts = evaluateCds({
      medicineName: 'aspirin',
      activeMedications: ['warfarin'],
      ddiRules: ddi,
      allergyRules: allergy,
    })
    const majorBleedingPair = alerts.filter(
      (a) =>
        a.kind === 'drug_drug' &&
        a.severity === 'major' &&
        a.category === 'bleeding' &&
        /aspirin/i.test(a.messageEn),
    )
    expect(majorBleedingPair).toHaveLength(0)

    // restore for other tests / subsequent runs
    await setCdsDrugInteractionActive(warfarinAspirin!.id!, true)
    invalidateCdsRulesCache()
  })
})
