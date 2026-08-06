import type { Invoice } from '../types'

export function invoiceTotal(inv: Pick<Invoice, 'items'>): number {
  return inv.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

export function invoiceRemaining(inv: Pick<Invoice, 'items' | 'paidAmount'>): number {
  return Math.max(0, invoiceTotal(inv) - inv.paidAmount)
}

export function invoiceStatusAfterPayment(
  inv: Pick<Invoice, 'items' | 'paidAmount' | 'status'>,
  paymentAmount: number,
): { status: Invoice['status']; paidAmount: number } {
  const total = invoiceTotal(inv)
  const paidAmount = Math.min(total, inv.paidAmount + paymentAmount)
  let status: Invoice['status'] = 'unpaid'
  if (paidAmount <= 0) status = 'unpaid'
  else if (paidAmount >= total) status = 'paid'
  else status = 'partial'
  return { status, paidAmount }
}

export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
