/**
 * Lightweight DLP redaction for exports (Phase D3).
 */

const PHONE_RE = /(\+?\d[\d\s\-()]{7,}\d)/g
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const NATIONAL_ID_RE = /\b\d{10}\b/g

export type DlpField = 'phone' | 'email' | 'nationalId' | 'name'

export interface DlpOptions {
  fields?: DlpField[]
  maskChar?: string
}

function mask(value: string, keep = 2, maskChar = '*'): string {
  if (value.length <= keep * 2) return maskChar.repeat(Math.max(4, value.length))
  return value.slice(0, keep) + maskChar.repeat(Math.max(4, value.length - keep * 2)) + value.slice(-keep)
}

/** Redact PHI-ish patterns in a free-text string. */
export function redactText(input: string, opts: DlpOptions = {}): string {
  const fields = new Set(opts.fields ?? ['phone', 'email', 'nationalId'])
  const maskChar = opts.maskChar ?? '*'
  let out = input
  if (fields.has('email')) out = out.replace(EMAIL_RE, (m) => mask(m, 1, maskChar))
  if (fields.has('phone')) out = out.replace(PHONE_RE, (m) => mask(m.replace(/\s/g, ''), 2, maskChar))
  if (fields.has('nationalId')) out = out.replace(NATIONAL_ID_RE, (m) => mask(m, 2, maskChar))
  return out
}

/** Deep-redact string values on a plain object / array (shallow-safe for export rows). */
export function redactRecord<T extends Record<string, unknown>>(
  row: T,
  sensitiveKeys: string[] = ['phone', 'email', 'nationalId', 'ssn', 'address'],
): T {
  const out: Record<string, unknown> = { ...row }
  for (const key of Object.keys(out)) {
    const val = out[key]
    if (typeof val === 'string') {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        out[key] = mask(val)
      } else {
        out[key] = redactText(val)
      }
    }
  }
  return out as T
}

export function redactRecords<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((r) => redactRecord(r))
}
