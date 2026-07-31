import { describe, expect, it } from 'vitest'
import {
  activityBarPercent,
  countAppointmentsOn,
  toDateKey,
  weeklyActivity,
} from './dashboard'
import type { Appointment } from '../types'

const make = (id: number, date: string, status: Appointment['status']): Appointment => ({
  id,
  patientId: 100 + id,
  doctorId: 1,
  patientName: `Patient ${id}`,
  doctorName: 'Dr. Ali',
  date,
  time: '09:00',
  status,
})

describe('toDateKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 6, 5))).toBe('2026-07-05')
  })
})

describe('countAppointmentsOn', () => {
  const appointments = [
    make(1, '2026-07-18', 'confirmed'),
    make(2, '2026-07-18', 'cancelled'),
    make(3, '2026-07-18', 'pending'),
    make(4, '2026-07-19', 'confirmed'),
  ]

  it('counts non-cancelled appointments for the given day', () => {
    expect(countAppointmentsOn(appointments, '2026-07-18')).toBe(2)
  })

  it('returns zero for a day with no appointments', () => {
    expect(countAppointmentsOn(appointments, '2026-07-20')).toBe(0)
  })
})

describe('weeklyActivity', () => {
  it('returns 7 chronological days ending today', () => {
    const result = weeklyActivity([], new Date(2026, 6, 18))
    expect(result).toHaveLength(7)
    expect(result[0].date).toBe('2026-07-12')
    expect(result[6].date).toBe('2026-07-18')
  })

  it('aggregates counts per day and ignores cancelled rows', () => {
    const appointments = [
      make(1, '2026-07-18', 'confirmed'),
      make(2, '2026-07-18', 'completed'),
      make(3, '2026-07-18', 'cancelled'),
      make(4, '2026-07-16', 'pending'),
      make(5, '2026-07-01', 'confirmed'),
    ]
    const result = weeklyActivity(appointments, new Date(2026, 6, 18))
    const byDate = Object.fromEntries(result.map((d) => [d.date, d.count]))
    expect(byDate['2026-07-18']).toBe(2)
    expect(byDate['2026-07-16']).toBe(1)
    expect(byDate['2026-07-17']).toBe(0)
    expect(result.reduce((sum, d) => sum + d.count, 0)).toBe(3)
  })
})

describe('activityBarPercent', () => {
  it('scales a count against the maximum', () => {
    expect(activityBarPercent(2, 4)).toBe(50)
    expect(activityBarPercent(4, 4)).toBe(100)
  })

  it('returns zero when there is no data', () => {
    expect(activityBarPercent(0, 0)).toBe(0)
  })
})
