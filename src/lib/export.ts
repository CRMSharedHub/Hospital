type ExportableRecord = Record<string, unknown>

/**
 * Convert an array of objects to CSV string.
 * Handles nested objects by JSON-stringifying them.
 */
export function toCSV(data: ExportableRecord[], columns?: string[]): string {
  if (data.length === 0) return ''

  const cols = columns ?? Object.keys(data[0])
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const header = cols.join(',')
  const rows = data.map((row) => cols.map((col) => escapeCell(row[col])).join(','))
  return [header, ...rows].join('\n')
}

/**
 * Trigger a file download in the browser.
 */
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

/**
 * Export data as CSV file.
 */
export function exportCSV(data: ExportableRecord[], filename: string, columns?: string[]): void {
  const csv = toCSV(data, columns)
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

/**
 * Export data as JSON file.
 */
export function exportJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  downloadFile(json, filename, 'application/json')
}

/**
 * Generate a timestamped filename.
 */
export function timestampedFilename(prefix: string, ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${prefix}_${ts}.${ext}`
}
