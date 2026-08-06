import type { MedicationAdministration } from '../types'

export const SEED_MAR: MedicationAdministration[] = [
  {
    id: 1,
    patientId: 103,
    patientName: 'Khalid Al-Rashid',
    medicineName: 'Metformin 500mg',
    dose: '500 mg',
    route: 'oral',
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
  },
  {
    id: 2,
    patientId: 101,
    patientName: 'أحمد محمد',
    medicineName: 'Amlodipine 5mg',
    dose: '5 mg',
    route: 'oral',
    scheduledAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'scheduled',
  },
  {
    id: 3,
    patientId: 101,
    patientName: 'أحمد محمد',
    medicineName: 'Amlodipine 5mg',
    dose: '5 mg',
    route: 'oral',
    scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    administeredAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    status: 'given',
    administeredBy: 'Nurse Demo',
  },
]
