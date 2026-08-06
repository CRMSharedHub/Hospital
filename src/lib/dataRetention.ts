export interface RetentionPolicy {
  table: string
  retentionDays: number
  description: string
}

export const RETENTION_POLICIES: RetentionPolicy[] = [
  { table: 'audit_log', retentionDays: 365 * 7, description: 'Audit logs retained for 7 years (HIPAA requirement)' },
  { table: 'visits', retentionDays: 365 * 7, description: 'Clinical visit records retained for 7 years' },
  { table: 'medications', retentionDays: 365 * 7, description: 'Medication records retained for 7 years' },
  { table: 'notes', retentionDays: 365 * 7, description: 'Clinical notes retained for 7 years' },
  { table: 'lab_tests', retentionDays: 365 * 7, description: 'Lab test results retained for 7 years' },
  { table: 'appointments', retentionDays: 365 * 2, description: 'Appointment records retained for 2 years after completion' },
  { table: 'invoices', retentionDays: 365 * 7, description: 'Invoice records retained for 7 years (tax compliance)' },
  { table: 'pharmacy_orders', retentionDays: 365 * 3, description: 'Pharmacy orders retained for 3 years' },
  { table: 'notifications', retentionDays: 90, description: 'Notifications purged after 90 days' },
]

export function getRetentionForTable(table: string): RetentionPolicy | undefined {
  return RETENTION_POLICIES.find((p) => p.table === table)
}

export function isRecordExpired(createdAt: string, retentionDays: number): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000
  return ageMs > retentionMs
}

export function getRecordAge(createdAt: string): { days: number; years: number } {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000))
  const years = Math.floor(days / 365)
  return { days, years }
}
