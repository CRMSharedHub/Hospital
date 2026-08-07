import type { Ward, Bed, Admission, BedStatus } from '../types'

export const SEED_WARDS: Ward[] = [
  { id: 1, code: 'MED-A', name: 'Medical Ward A', floor: '2' },
  { id: 2, code: 'SUR-B', name: 'Surgical Ward B', floor: '3' },
  { id: 3, code: 'ICU', name: 'Intensive Care', floor: '4' },
]

export const SEED_BEDS: Bed[] = [
  ...[1, 2, 3, 4].map((n) => ({ id: n, wardId: 1, label: String(n), status: 'available' as BedStatus })),
  ...[5, 6, 7, 8].map((n, i) => ({ id: n, wardId: 2, label: String(i + 1), status: 'available' as BedStatus })),
  ...[9, 10, 11, 12].map((n, i) => ({ id: n, wardId: 3, label: String(i + 1), status: 'available' as BedStatus })),
]

/** Demo: one occupied bed for census realism */
export function seedBedsWithDemoOccupancy(): Bed[] {
  return SEED_BEDS.map((b) => (b.id === 1 ? { ...b, status: 'occupied' as BedStatus } : b))
}

export const SEED_ADMISSIONS: Admission[] = [
  {
    id: 1,
    patientId: 103,
    patientName: 'Khalid Al-Rashid',
    bedId: 1,
    wardId: 1,
    attendingDoctorId: 1,
    attendingDoctorName: 'د. سارة القحطاني',
    status: 'admitted',
    admitReason: 'Diabetes monitoring',
    admittedAt: new Date().toISOString(),
  },
]
