import { redactRecords } from './dlp'
import { dal } from './dal'

type ExportableRecord = Record<string, unknown>

/**
 * Convert an array of objects to CSV string.
 */
export function toCSV(data: ExportableRecord[], columns?: string[]): string {
  if (data.length === 0) return ''

  const cols = columns ?? Object.keys(data[0])
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const header = cols.join(',')
  const rows = data.map((row) => cols.map((col) => escapeCell(row[col])).join(','))
  return [header, ...rows].join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function auditExport(kind: 'csv' | 'json', filename: string, rowCount: number, dlp: boolean) {
  try {
    await dal.logAudit('export', 'downloads', filename, { kind, rowCount, dlp })
  } catch {
    // non-fatal — export should still succeed offline
  }
}

/** Export data as CSV — DLP redaction on by default (Phase D). */
export function exportCSV(
  data: ExportableRecord[],
  filename: string,
  columns?: string[],
  opts?: { dlp?: boolean; audit?: boolean },
): void {
  const dlp = opts?.dlp !== false
  const rows = dlp ? redactRecords(data) : data
  downloadFile(toCSV(rows, columns), filename, 'text/csv;charset=utf-8;')
  if (opts?.audit !== false) {
    void auditExport('csv', filename, rows.length, dlp)
  }
}

/** Export data as JSON — DLP redaction on by default for arrays. */
export function exportJSON(data: unknown, filename: string, opts?: { dlp?: boolean; audit?: boolean }): void {
  const dlp = opts?.dlp !== false
  let payload = data
  let rowCount = 0
  if (dlp && Array.isArray(data)) {
    payload = redactRecords(data as ExportableRecord[])
    rowCount = (payload as unknown[]).length
  } else if (Array.isArray(data)) {
    rowCount = data.length
  }
  downloadFile(JSON.stringify(payload, null, 2), filename, 'application/json')
  if (opts?.audit !== false) {
    void auditExport('json', filename, rowCount, dlp)
  }
}

export function timestampedFilename(prefix: string, ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${prefix}_${ts}.${ext}`
}
