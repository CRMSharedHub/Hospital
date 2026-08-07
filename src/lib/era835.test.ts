import { describe, expect, it } from 'vitest'
import { encodeEra835, parseEra835, eraToRemittances } from './era835'

describe('era835', () => {
  it('round-trips encode/parse', () => {
    const raw = encodeEra835({
      remittanceRef: 'ERA-99',
      payerName: 'Acme Payer',
      currency: 'USD',
      claims: [
        { claimId: 42, statusCode: '1', chargeAmount: 200, paidAmount: 180, adjustmentAmount: 20 },
        { claimId: 43, statusCode: '2', chargeAmount: 50, paidAmount: 0, adjustmentAmount: 50 },
      ],
    })
    expect(raw).toContain('ST*835')
    expect(raw).toContain('CLP*42*1')
    const parsed = parseEra835(raw)
    expect(parsed.remittanceRef).toBe('ERA-99')
    expect(parsed.payerName).toBe('Acme Payer')
    expect(parsed.claims).toHaveLength(2)
    expect(parsed.claims[0]?.paidAmount).toBe(180)
  })

  it('maps to remittance statuses', () => {
    const advice = parseEra835(
      'TRN*1*REF1~\nN1*PR*Payer~\nCUR*1D*SAR~\nCLP*7*3*100.00*60.00*40.00*12*REF1~',
    )
    const rows = eraToRemittances(advice)
    expect(rows[0]?.status).toBe('partial')
    expect(rows[0]?.currency).toBe('SAR')
    expect(rows[0]?.claimId).toBe(7)
  })

  it('rejects empty / no CLP', () => {
    expect(() => parseEra835('')).toThrow(/Empty/)
    expect(() => parseEra835('ISA*00~')).toThrow(/No CLP/)
  })
})
