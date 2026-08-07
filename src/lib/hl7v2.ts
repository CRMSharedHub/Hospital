/**
 * Thin HL7 v2.x adapter (pipe-delimited).
 * Supports encode/decode stubs for ADT^A01, ORM^O01, ORU^R01 — not a full MLLP stack.
 */

export type Hl7MessageType = 'ADT^A01' | 'ORM^O01' | 'ORU^R01'

export interface Hl7Patient {
  id: number | string
  name: string
  phone?: string
}

export interface Hl7EncodeInput {
  messageType: Hl7MessageType
  patient: Hl7Patient
  /** Encounter / order / observation free text */
  detail?: string
  doctorName?: string
  date?: string
  /** Lab result text for ORU */
  result?: string
  controlId?: string
}

export interface Hl7ParsedMessage {
  messageType: string
  controlId: string
  patientId?: string
  patientName?: string
  phone?: string
  detail?: string
  result?: string
  segments: Record<string, string[]>
  raw: string
}

const FS = '\r'
const SEP = '|'
const COMP = '^'

function nowTs(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function escapeHl7(s: string): string {
  return s.replace(/\|/g, ' ').replace(/\^/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ')
}

/** Build a minimal HL7 v2 message string. */
export function encodeHl7(input: Hl7EncodeInput): string {
  const controlId = input.controlId ?? `DYN${Date.now()}`
  const ts = nowTs(input.date ? new Date(input.date) : new Date())
  const nameParts = escapeHl7(input.patient.name).split(/\s+/)
  const family = nameParts[0] ?? 'UNKNOWN'
  const given = nameParts.slice(1).join(' ') || family
  const pid = [
    'PID',
    '1',
    '',
    `${input.patient.id}^^^HOSP^MR`,
    '',
    `${family}${COMP}${given}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    input.patient.phone ? `^^PH^^^${escapeHl7(input.patient.phone)}` : '',
  ].join(SEP)

  const msh = [
    'MSH',
    '^~\\&',
    'DYNEX360',
    'HOSP',
    'REMOTE',
    'LIS',
    ts,
    '',
    input.messageType,
    controlId,
    'P',
    '2.5',
  ].join(SEP)

  if (input.messageType === 'ADT^A01') {
    const evn = ['EVN', 'A01', ts].join(SEP)
    const pv1 = [
      'PV1',
      '1',
      'O',
      '',
      '',
      '',
      '',
      input.doctorName ? `^^^${escapeHl7(input.doctorName)}` : '',
    ].join(SEP)
    return [msh, evn, pid, pv1].join(FS) + FS
  }

  if (input.messageType === 'ORM^O01') {
    const orc = ['ORC', 'NW', controlId].join(SEP)
    const obr = [
      'OBR',
      '1',
      controlId,
      '',
      `^^^${escapeHl7(input.detail ?? 'ORDER')}`,
      '',
      '',
      ts,
    ].join(SEP)
    return [msh, pid, orc, obr].join(FS) + FS
  }

  // ORU^R01
  const orc = ['ORC', 'RE', controlId].join(SEP)
  const obr = [
    'OBR',
    '1',
    controlId,
    '',
    `^^^${escapeHl7(input.detail ?? 'RESULT')}`,
    '',
    '',
    ts,
  ].join(SEP)
  const obx = [
    'OBX',
    '1',
    'TX',
    `^^^${escapeHl7(input.detail ?? 'RESULT')}`,
    '',
    escapeHl7(input.result ?? ''),
    '',
    '',
    '',
    '',
    '',
    'F',
  ].join(SEP)
  return [msh, pid, orc, obr, obx].join(FS) + FS
}

/** Parse a pipe-delimited HL7 message into a structured stub. */
export function decodeHl7(raw: string): Hl7ParsedMessage {
  const normalized = raw.replace(/\n/g, '\r').replace(/\r+/g, '\r').trim()
  const lines = normalized.split('\r').filter(Boolean)
  const segments: Record<string, string[]> = {}
  for (const line of lines) {
    const fields = line.split(SEP)
    const type = fields[0]
    if (!type) continue
    segments[type] = fields
  }

  const msh = segments.MSH ?? []
  const pid = segments.PID ?? []
  const obr = segments.OBR ?? []
  const obx = segments.OBX ?? []

  const nameField = pid[5] ?? ''
  const [family, given] = nameField.split(COMP)
  const patientName = [family, given].filter(Boolean).join(' ') || undefined
  const idField = pid[3] ?? ''
  const patientId = idField.split(COMP)[0] || undefined

  return {
    messageType: msh[8] ?? '',
    controlId: msh[9] ?? '',
    patientId,
    patientName,
    phone: pid[13]?.includes(COMP) ? pid[13].split(COMP).pop() : pid[13],
    detail: obr[4]?.split(COMP).filter(Boolean).pop() ?? obr[4],
    result: obx[5],
    segments,
    raw: normalized,
  }
}

export function hl7ToFhirHints(parsed: Hl7ParsedMessage): { resourceType: string; note: string }[] {
  const type = parsed.messageType.toUpperCase()
  if (type.startsWith('ADT')) {
    return [
      { resourceType: 'Patient', note: `id=${parsed.patientId} name=${parsed.patientName}` },
      { resourceType: 'Encounter', note: 'Admit/visit from ADT' },
    ]
  }
  if (type.startsWith('ORM')) {
    return [
      { resourceType: 'ServiceRequest', note: parsed.detail ?? 'order' },
      { resourceType: 'Patient', note: `id=${parsed.patientId}` },
    ]
  }
  if (type.startsWith('ORU')) {
    return [
      { resourceType: 'Observation', note: `${parsed.detail}: ${parsed.result ?? ''}` },
      { resourceType: 'Patient', note: `id=${parsed.patientId}` },
    ]
  }
  return [{ resourceType: 'Bundle', note: 'Unknown HL7 type' }]
}
