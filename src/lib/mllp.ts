/**
 * Minimal MLLP (Minimal Lower Layer Protocol) framing for HL7 v2.
 * Browser/demo: frame over HTTP body — not a live TCP listener.
 */

import { decodeHl7, encodeHl7, type Hl7EncodeInput, type Hl7ParsedMessage } from './hl7v2'

/** Start of block */
export const MLLP_VT = '\x0b'
/** End of block */
export const MLLP_FS = '\x1c'
/** Carriage return after FS */
export const MLLP_CR = '\r'

/** Wrap an HL7 message in MLLP framing. */
export function frameMllp(hl7: string): string {
  const body = hl7.replace(/^\x0b/, '').replace(/\x1c\r?$/, '')
  return `${MLLP_VT}${body}${MLLP_FS}${MLLP_CR}`
}

/** Extract HL7 payload from an MLLP frame (or pass-through bare HL7). */
export function unframeMllp(framed: string): string {
  const vt = framed.indexOf(MLLP_VT)
  const fs = framed.indexOf(MLLP_FS, vt >= 0 ? vt : 0)
  if (vt >= 0 && fs > vt) {
    return framed.slice(vt + 1, fs)
  }
  // Already bare HL7
  return framed.replace(/^\x0b/, '').replace(/\x1c\r?$/, '')
}

export function isMllpFramed(s: string): boolean {
  return s.includes(MLLP_VT) && s.includes(MLLP_FS)
}

/** Build a minimal MSA ACK for an inbound message. */
export function buildMllpAck(parsed: Hl7ParsedMessage, ackCode: 'AA' | 'AE' | 'AR' = 'AA'): string {
  const controlId = parsed.controlId || `ACK${Date.now()}`
  const ts = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${ts.getFullYear()}${p(ts.getMonth() + 1)}${p(ts.getDate())}${p(ts.getHours())}${p(ts.getMinutes())}${p(ts.getSeconds())}`
  const msh = [
    'MSH',
    '^~\\&',
    'DYNEX360',
    'HOSP',
    'REMOTE',
    'LIS',
    stamp,
    '',
    'ACK',
    `ACK${controlId}`,
    'P',
    '2.5',
  ].join('|')
  const msa = ['MSA', ackCode, controlId].join('|')
  return frameMllp(`${msh}\r${msa}`)
}

/** Encode HL7 then MLLP-frame it. */
export function encodeMllp(input: Hl7EncodeInput): string {
  return frameMllp(encodeHl7(input))
}

/** Unframe + decode HL7. */
export function decodeMllp(framed: string): Hl7ParsedMessage {
  return decodeHl7(unframeMllp(framed))
}

export interface OruIngestHint {
  patientId: number
  patientName?: string
  testName: string
  result: string
  controlId: string
}

/** Pull lab-oriented fields from a parsed ORU (or ORM with detail). */
export function oruToLabHint(parsed: Hl7ParsedMessage): OruIngestHint | null {
  const patientId = Number(parsed.patientId)
  if (!patientId) return null
  const testName = parsed.detail || 'Lab result'
  const result = parsed.result || parsed.detail || ''
  if (!result && !parsed.detail) return null
  return {
    patientId,
    patientName: parsed.patientName,
    testName,
    result: result || testName,
    controlId: parsed.controlId,
  }
}
