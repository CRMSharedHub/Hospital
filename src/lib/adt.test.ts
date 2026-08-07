import { describe, expect, it } from 'vitest'
import { computeCensusStats, canAdmitToBed, canAdmitPatient } from './adt'
import type { Admission, Bed } from '../types'

const beds: Bed[] = [
  { id: 1, wardId: 1, label: '1', status: 'available' },
  { id: 2, wardId: 1, label: '2', status: 'occupied' },
  { id: 3, wardId: 1, label: '3', status: 'cleaning' },
  { id: 4, wardId: 1, label: '4', status: 'blocked' },
]

const admissions: Admission[] = [
  {
    id: 1,
    patientId: 103,
    patientName: 'Khalid',
    bedId: 2,
    wardId: 1,
    status: 'admitted',
    admittedAt: '2026-08-01T10:00:00Z',
  },
]

describe('computeCensusStats', () => {
  it('counts bed statuses and occupancy', () => {
    const s = computeCensusStats(beds, admissions)
    expect(s.totalBeds).toBe(4)
    expect(s.available).toBe(1)
    expect(s.occupied).toBe(1)
    expect(s.cleaning).toBe(1)
    expect(s.blocked).toBe(1)
    expect(s.activeAdmissions).toBe(1)
    expect(s.occupancyRate).toBe(25)
  })

  it('returns 0 occupancy for empty wards', () => {
    expect(computeCensusStats([], []).occupancyRate).toBe(0)
  })
})

describe('canAdmitToBed', () => {
  it('allows available empty bed', () => {
    expect(canAdmitToBed(beds[0], undefined)).toBeNull()
  })

  it('rejects occupied, cleaning, blocked', () => {
    expect(canAdmitToBed(beds[1], admissions[0])).toBe('Bed is occupied')
    expect(canAdmitToBed(beds[2], undefined)).toBe('Bed is being cleaned')
    expect(canAdmitToBed(beds[3], undefined)).toBe('Bed is blocked')
    expect(canAdmitToBed(undefined, undefined)).toBe('Bed not found')
  })
})

describe('canAdmitPatient', () => {
  it('blocks second active admission', () => {
    expect(canAdmitPatient(admissions[0])).toBe('Patient already has an active admission')
    expect(canAdmitPatient(undefined)).toBeNull()
  })
})
