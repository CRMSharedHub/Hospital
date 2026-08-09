import { describe, expect, it, beforeEach } from 'vitest'
import { getActiveCdsRules, invalidateCdsRulesCache } from './cdsRulesStore'
import { SEED_DDI_RULES } from './cdsSeed'

describe('cdsRulesStore', () => {
  beforeEach(() => invalidateCdsRulesCache())

  it('returns seed rules when supabase is not configured', async () => {
    const { ddi, allergy } = await getActiveCdsRules()
    expect(ddi.length).toBeGreaterThanOrEqual(SEED_DDI_RULES.filter((r) => r.active).length)
    expect(allergy.length).toBeGreaterThan(0)
  })
})
