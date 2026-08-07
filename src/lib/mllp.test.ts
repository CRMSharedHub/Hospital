import { describe, expect, it } from 'vitest'
import { encodeHl7 } from './hl7v2'
import {
  frameMllp,
  unframeMllp,
  encodeMllp,
  decodeMllp,
  buildMllpAck,
  oruToLabHint,
  MLLP_VT,
  MLLP_FS,
} from './mllp'

describe('mllp', () => {
  it('frames and unframes', () => {
    const hl7 = encodeHl7({
      messageType: 'ORU^R01',
      patient: { id: 101, name: 'Ahmed Mohamed' },
      detail: 'CBC',
      result: 'WBC 7.2',
    })
    const framed = frameMllp(hl7)
    expect(framed.startsWith(MLLP_VT)).toBe(true)
    expect(framed.includes(MLLP_FS)).toBe(true)
    expect(unframeMllp(framed)).toBe(hl7)
  })

  it('decodeMllp + ACK + ORU hint', () => {
    const framed = encodeMllp({
      messageType: 'ORU^R01',
      patient: { id: 101, name: 'Ahmed Mohamed' },
      detail: 'Lipid Panel',
      result: 'LDL 130',
      controlId: 'CTL1',
    })
    const parsed = decodeMllp(framed)
    expect(parsed.messageType).toContain('ORU')
    const hint = oruToLabHint(parsed)
    expect(hint?.patientId).toBe(101)
    expect(hint?.result).toContain('LDL')
    const ack = buildMllpAck(parsed, 'AA')
    expect(ack.includes('MSA|AA|CTL1')).toBe(true)
  })
})
