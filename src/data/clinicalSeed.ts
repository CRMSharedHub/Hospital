import type { VitalSign, Problem } from '../types'

export const SEED_VITALS: VitalSign[] = [
  {
    id: 1,
    patientId: 103,
    recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    recordedBy: 'Nurse Demo',
    temperatureC: 37.2,
    heartRate: 88,
    respiratoryRate: 18,
    systolicBp: 128,
    diastolicBp: 82,
    spo2: 97,
    notes: 'Admission baseline',
  },
  {
    id: 2,
    patientId: 101,
    recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    recordedBy: 'Nurse Demo',
    temperatureC: 36.8,
    heartRate: 72,
    respiratoryRate: 16,
    systolicBp: 118,
    diastolicBp: 76,
    spo2: 99,
    notes: 'Clinic visit',
  },
]

export const SEED_PROBLEMS: Problem[] = [
  {
    id: 1,
    patientId: 103,
    code: 'E11.9',
    display: 'Type 2 diabetes mellitus',
    status: 'active',
    severity: 'moderate',
    onsetDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    recordedBy: 'Dr Demo',
  },
  {
    id: 2,
    patientId: 101,
    code: 'I10',
    display: 'Essential hypertension',
    status: 'active',
    severity: 'mild',
    onsetDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    recordedBy: 'Dr Demo',
  },
]
