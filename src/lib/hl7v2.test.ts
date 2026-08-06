import { describe, expect, it } from 'vitest'
import { encodeHl7, decodeHl7, hl7ToFhirHints } from './hl7v2'

describe('hl7v2', () => {
  it('encodes and decodes ADT^A01', () => {
    const raw = encodeHl7({
      messageType: 'ADT^A01',
      patient: { id: 101, name: 'Ahmed Mohamed', phone: '+966' },
      doctorName: 'Dr Sarah',
      controlId: 'TEST1',
    })
    expect(raw).toContain('MSH|')
    expect(raw).toContain('ADT^A01')
    const parsed = decodeHl7(raw)
    expect(parsed.messageType).toBe('ADT^A01')
    expect(parsed.controlId).toBe('TEST1')
    expect(parsed.patientId).toBe('101')
    expect(hl7ToFhirHints(parsed)[0]?.resourceType).toBe('Patient')
  })

  it('encodes ORU with result', () => {
    const raw = encodeHl7({
      messageType: 'ORU^R01',
      patient: { id: 101, name: 'Test' },
      detail: 'HbA1c',
      result: '6.8%',
      controlId: 'LAB1',
    })
    const parsed = decodeHl7(raw)
    expect(parsed.messageType).toBe('ORU^R01')
    expect(parsed.result).toContain('6.8')
  })
})
