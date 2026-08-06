import { describe, expect, it } from 'vitest'
import { invoiceTotal, invoiceRemaining, invoiceStatusAfterPayment } from './billingMath'

const sample = {
  items: [
    { description: 'A', quantity: 2, unitPrice: 50 },
    { description: 'B', quantity: 1, unitPrice: 100 },
  ],
  paidAmount: 0,
  status: 'unpaid' as const,
}

describe('billingMath', () => {
  it('sums invoice line items', () => {
    expect(invoiceTotal(sample)).toBe(200)
  })

  it('computes remaining balance', () => {
    expect(invoiceRemaining({ ...sample, paidAmount: 50 })).toBe(150)
  })

  it('marks paid when payment covers total', () => {
    expect(invoiceStatusAfterPayment(sample, 200)).toEqual({ status: 'paid', paidAmount: 200 })
  })

  it('marks partial for underpayment', () => {
    expect(invoiceStatusAfterPayment(sample, 80)).toEqual({ status: 'partial', paidAmount: 80 })
  })
})
