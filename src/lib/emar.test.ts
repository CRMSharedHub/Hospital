import { describe, expect, it } from 'vitest'
import { canAdminister, countDueMar, countPendingMar } from './emar'
import type { MedicationAdministration } from '../types'

describe('emar', () => {
  it('only allows administer from scheduled', () => {
    expect(canAdminister('scheduled')).toBeNull()
    expect(canAdminister('given')).toContain('Cannot administer')
  })

  it('counts due and pending', () => {
    const entries: MedicationAdministration[] = [
      {
        id: 1,
        patientId: 1,
        patientName: 'A',
        medicineName: 'X',
        dose: '1',
        scheduledAt: new Date(Date.now() - 1000).toISOString(),
        status: 'scheduled',
      },
      {
        id: 2,
        patientId: 1,
        patientName: 'A',
        medicineName: 'Y',
        dose: '1',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'scheduled',
      },
      {
        id: 3,
        patientId: 1,
        patientName: 'A',
        medicineName: 'Z',
        dose: '1',
        scheduledAt: new Date().toISOString(),
        status: 'given',
      },
    ]
    expect(countDueMar(entries)).toBe(1)
    expect(countPendingMar(entries)).toBe(2)
  })
})
