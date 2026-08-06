/**
 * Thin X12 835-style ERA (Electronic Remittance Advice) encode/parse.
 * Not a full HIPAA 835 — segment stubs for demo / import into remittances.
 */

export interface EraClaimPayment {
  claimId: number
  /** 1=processed, 2=denied, 3=partial (local convention) */
  statusCode: '1' | '2' | '3'
  chargeAmount: number
  paidAmount: number
  adjustmentAmount: number
}

export interface EraAdvice {
  remittanceRef: string
  payerName: string
  currency: string
  claims: EraClaimPayment[]
  raw?: string
}

export type RemittanceFromEra = {
  claimId: number
  payerName: string
  amountPaid: number
  amountAdjusted: number
  currency: string
  status: 'posted' | 'denied' | 'partial'
  remittanceRef: string
  notes: string
}

function money(n: number): string {
  return n.toFixed(2)
}

/** Encode a minimal 835-like ERA document (segment * delimited, ~ terminated). */
export function encodeEra835(advice: EraAdvice): string {
  const lines = [
    'ISA*00*          *00*          *ZZ*DYNEX360       *ZZ*PAYER          *260101*1200*^*00501*000000001*0*P*:~',
    'GS*HP*DYNEX360*PAYER*20260101*1200*1*X*005010X221A1~',
    'ST*835*0001~',
    `BPR*I*${money(advice.claims.reduce((s, c) => s + c.paidAmount, 0))}*C*ACH**01*999999999*DA*1234567890*${advice.remittanceRef}~`,
    `TRN*1*${advice.remittanceRef}*1999999999~`,
    `N1*PR*${escapeSeg(advice.payerName)}~`,
    `CUR*1D*${advice.currency}~`,
  ]
  for (const c of advice.claims) {
    lines.push(
      `CLP*${c.claimId}*${c.statusCode}*${money(c.chargeAmount)}*${money(c.paidAmount)}*${money(c.adjustmentAmount)}*12*${advice.remittanceRef}~`,
    )
  }
  lines.push('SE*10*0001~', 'GE*1*1~', 'IEA*1*000000001~')
  return lines.join('\n')
}

function escapeSeg(s: string): string {
  return s.replace(/[*~]/g, ' ')
}

/** Parse thin 835-like text into structured advice. */
export function parseEra835(raw: string): EraAdvice {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!text) throw new Error('Empty ERA document')

  let remittanceRef = ''
  let payerName = 'Unknown payer'
  let currency = 'USD'
  const claims: EraClaimPayment[] = []

  const segments = text
    .split(/~\s*/)
    .map((s) => s.trim())
    .filter(Boolean)

  for (const seg of segments) {
    const parts = seg.split('*')
    const tag = parts[0]
    if (tag === 'TRN' && parts[2]) remittanceRef = parts[2]
    if (tag === 'BPR' && parts[10] && !remittanceRef) remittanceRef = parts[10]
    if (tag === 'N1' && parts[1] === 'PR' && parts[2]) payerName = parts[2]
    if (tag === 'CUR' && parts[2]) currency = parts[2]
    if (tag === 'CLP') {
      const claimId = Number(parts[1])
      if (!claimId) continue
      const statusCode = (parts[2] === '2' || parts[2] === '3' ? parts[2] : '1') as '1' | '2' | '3'
      claims.push({
        claimId,
        statusCode,
        chargeAmount: Number(parts[3] || 0),
        paidAmount: Number(parts[4] || 0),
        adjustmentAmount: Number(parts[5] || 0),
      })
      if (parts[7] && !remittanceRef) remittanceRef = parts[7]
    }
  }

  if (!claims.length) throw new Error('No CLP claim segments found in ERA')
  if (!remittanceRef) remittanceRef = `ERA-${Date.now()}`

  return { remittanceRef, payerName, currency, claims, raw: text }
}

/** Map parsed ERA claims to remittance post payloads. */
export function eraToRemittances(advice: EraAdvice): RemittanceFromEra[] {
  return advice.claims.map((c) => {
    const status =
      c.statusCode === '2' ? 'denied' : c.statusCode === '3' ? 'partial' : 'posted'
    return {
      claimId: c.claimId,
      payerName: advice.payerName,
      amountPaid: c.paidAmount,
      amountAdjusted: c.adjustmentAmount,
      currency: advice.currency,
      status,
      remittanceRef: advice.remittanceRef,
      notes: `Imported from ERA 835 stub (${advice.remittanceRef})`,
    }
  })
}
