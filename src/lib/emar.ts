import type { MedicationAdministration, MarStatus } from '../types'

export function canAdminister(status: MarStatus | undefined): string | null {
  if (!status) return 'MAR entry not found'
  if (status !== 'scheduled') return `Cannot administer when status is ${status}`
  return null
}

export function countDueMar(entries: MedicationAdministration[], now = new Date()): number {
  return entries.filter(
    (e) => e.status === 'scheduled' && new Date(e.scheduledAt).getTime() <= now.getTime(),
  ).length
}

export function countPendingMar(entries: MedicationAdministration[]): number {
  return entries.filter((e) => e.status === 'scheduled').length
}

export function nextStatusAction(status: MarStatus): MarStatus[] {
  if (status === 'scheduled') return ['given', 'held', 'refused', 'missed']
  return []
}
