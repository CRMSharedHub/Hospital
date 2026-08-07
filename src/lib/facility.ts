/**
 * Multi-facility helpers (Phase D1).
 */

export interface FacilityInput {
  code: string
  name: string
  city?: string
  timezone?: string
  active?: boolean
}

export function normalizeFacilityCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16)
}

export function canAccessFacility(
  membershipFacilityIds: number[],
  facilityId: number | null | undefined,
  isAdmin: boolean,
): boolean {
  if (facilityId == null) return isAdmin
  if (isAdmin && membershipFacilityIds.length === 0) return true
  return membershipFacilityIds.includes(facilityId)
}

/** Filter rows that carry an optional facilityId. */
export function filterByFacility<T extends { facilityId?: number }>(
  rows: T[],
  activeFacilityId: number | null | undefined,
): T[] {
  if (activeFacilityId == null) return rows
  return rows.filter((r) => r.facilityId == null || r.facilityId === activeFacilityId)
}
