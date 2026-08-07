import type { Admission, Bed, BedStatus } from '../types'

export type { BedStatus }
export type { AdmissionStatus } from '../types'

export interface CensusStats {
  totalBeds: number
  available: number
  occupied: number
  cleaning: number
  blocked: number
  activeAdmissions: number
  occupancyRate: number
}

export function computeCensusStats(beds: Bed[], admissions: Admission[]): CensusStats {
  const totalBeds = beds.length
  const available = beds.filter((b) => b.status === 'available').length
  const occupied = beds.filter((b) => b.status === 'occupied').length
  const cleaning = beds.filter((b) => b.status === 'cleaning').length
  const blocked = beds.filter((b) => b.status === 'blocked').length
  const activeAdmissions = admissions.filter((a) => a.status === 'admitted').length
  const occupancyRate = totalBeds === 0 ? 0 : Math.round((occupied / totalBeds) * 1000) / 10
  return { totalBeds, available, occupied, cleaning, blocked, activeAdmissions, occupancyRate }
}

export function canAdmitToBed(bed: Bed | undefined, activeOnBed: Admission | undefined): string | null {
  if (!bed) return 'Bed not found'
  if (bed.status === 'blocked') return 'Bed is blocked'
  if (bed.status === 'cleaning') return 'Bed is being cleaned'
  if (bed.status === 'occupied' || activeOnBed) return 'Bed is occupied'
  return null
}

export function canAdmitPatient(activeForPatient: Admission | undefined): string | null {
  if (activeForPatient) return 'Patient already has an active admission'
  return null
}
