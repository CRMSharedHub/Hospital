import { describe, expect, it } from 'vitest'
import { buildAppointment, hasConflict, type AppointmentDraft } from './appointments'
import type { Appointment } from '../types'

const draft: AppointmentDraft = {
  patientId: 101,
  doctorId: 1,
  date: '2026-08-01',
  time: '09:00',
}

const base: Appointment = {
  id: 1,
  patientId: 102,
  doctorId: 1,
  patientName: 'Sara',
  doctorName: 'Dr. Ali',
  date: '2026-08-01',
  time: '09:00',
  status: 'confirmed',
}

describe('hasConflict', () => {
  it('detects a clash on the same doctor, date and time', () => {
    expect(hasConflict([base], draft)).toBe(true)
  })

  it('ignores cancelled appointments', () => {
    expect(hasConflict([{ ...base, status: 'cancelled' }], draft)).toBe(false)
  })

  it('allows a different doctor at the same slot', () => {
    expect(hasConflict([{ ...base, doctorId: 2 }], draft)).toBe(false)
  })

  it('allows the same doctor at a different time', () => {
    expect(hasConflict([{ ...base, time: '10:00' }], draft)).toBe(false)
  })

  it('allows the same doctor on a different date', () => {
    expect(hasConflict([{ ...base, date: '2026-08-02' }], draft)).toBe(false)
  })

  it('returns false when there are no existing appointments', () => {
    expect(hasConflict([], draft)).toBe(false)
  })
})

describe('buildAppointment', () => {
  it('maps ids, denormalised names and defaults to pending', () => {
    const result = buildAppointment(
      draft,
      { id: 101, name: 'Ahmed' },
      { id: 1, name: 'Dr. Ali' },
    )

    expect(result).toEqual({
      patientId: 101,
      doctorId: 1,
      patientName: 'Ahmed',
      doctorName: 'Dr. Ali',
      date: '2026-08-01',
      time: '09:00',
      status: 'pending',
    })
  })

  it('does not include an id', () => {
    const result = buildAppointment(draft, { id: 101, name: 'Ahmed' }, { id: 1, name: 'Dr. Ali' })
    expect('id' in result).toBe(false)
  })
})
