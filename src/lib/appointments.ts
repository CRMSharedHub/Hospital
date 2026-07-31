import type { Appointment, Doctor, Patient } from '../types'

export interface AppointmentDraft {
  patientId: number
  doctorId: number
  date: string
  time: string
}

export function hasConflict(existing: Appointment[], draft: AppointmentDraft): boolean {
  return existing.some(
    (a) =>
      a.doctorId === draft.doctorId &&
      a.date === draft.date &&
      a.time === draft.time &&
      a.status !== 'cancelled',
  )
}

export function buildAppointment(
  draft: AppointmentDraft,
  patient: Pick<Patient, 'id' | 'name'>,
  doctor: Pick<Doctor, 'id' | 'name'>,
): Omit<Appointment, 'id'> {
  return {
    patientId: patient.id,
    doctorId: doctor.id,
    patientName: patient.name,
    doctorName: doctor.name,
    date: draft.date,
    time: draft.time,
    status: 'pending',
  }
}
