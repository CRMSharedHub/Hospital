import { describe, expect, it } from 'vitest'
import { canAccessFacility, filterByFacility, normalizeFacilityCode } from './facility'

describe('facility', () => {
  it('normalizes codes', () => {
    expect(normalizeFacilityCode(' main campus ')).toBe('MAINCAMPUS')
    expect(normalizeFacilityCode('north-01')).toBe('NORTH-01')
  })

  it('checks membership access', () => {
    expect(canAccessFacility([1, 2], 1, false)).toBe(true)
    expect(canAccessFacility([1], 2, false)).toBe(false)
    expect(canAccessFacility([], 1, true)).toBe(true)
    expect(canAccessFacility([], null, true)).toBe(true)
  })

  it('filters by active facility', () => {
    const rows = [
      { id: 1, facilityId: 1 },
      { id: 2, facilityId: 2 },
      { id: 3 },
    ]
    expect(filterByFacility(rows, 1).map((r) => r.id)).toEqual([1, 3])
    expect(filterByFacility(rows, null)).toHaveLength(3)
  })
})
