import { describe, expect, it } from 'vitest'
import {
  appointmentStatusBreakdown,
  doctorWorkload,
  billingSummary,
  invoiceTotal,
  pharmacySummary,
  labSummary,
  monthlyRevenueTrend,
} from './reports'
import type { Appointment, Invoice, Medicine, PharmacyOrder, LabTest, Doctor } from '../types'

const makeAppt = (id: number, status: Appointment['status'], doctorId: number): Appointment => ({
  id,
  patientId: 100 + id,
  doctorId,
  patientName: `Patient ${id}`,
  doctorName: `Dr. ${doctorId}`,
  date: '2026-07-18',
  time: '09:00',
  status,
})

describe('appointmentStatusBreakdown', () => {
  it('counts each status and computes percent', () => {
    const appts = [
      makeAppt(1, 'confirmed', 1),
      makeAppt(2, 'confirmed', 1),
      makeAppt(3, 'pending', 2),
      makeAppt(4, 'cancelled', 1),
    ]
    const result = appointmentStatusBreakdown(appts)
    expect(result).toHaveLength(4)
    const confirmed = result.find((r) => r.status === 'confirmed')!
    expect(confirmed.count).toBe(2)
    expect(confirmed.percent).toBe(50)
    const cancelled = result.find((r) => r.status === 'cancelled')!
    expect(cancelled.count).toBe(1)
    expect(cancelled.percent).toBe(25)
  })

  it('returns zero percents for empty array', () => {
    const result = appointmentStatusBreakdown([])
    expect(result.every((r) => r.count === 0 && r.percent === 0)).toBe(true)
  })
})

describe('doctorWorkload', () => {
  const doctors: Doctor[] = [
    { id: 1, name: 'Dr. A', specialty: 'Cardiology', available: true, patients: 10, rating: 4.5 },
    { id: 2, name: 'Dr. B', specialty: 'Neurology', available: false, patients: 5, rating: 4.0 },
  ]

  it('counts appointments per doctor sorted by count descending', () => {
    const appts = [
      makeAppt(1, 'confirmed', 1),
      makeAppt(2, 'confirmed', 1),
      makeAppt(3, 'confirmed', 2),
    ]
    const result = doctorWorkload(appts, doctors)
    expect(result[0].doctorName).toBe('Dr. A')
    expect(result[0].appointmentCount).toBe(2)
    expect(result[1].appointmentCount).toBe(1)
  })

  it('returns zero for doctors with no appointments', () => {
    const result = doctorWorkload([], doctors)
    expect(result.every((w) => w.appointmentCount === 0)).toBe(true)
  })
})

describe('invoiceTotal', () => {
  it('sums quantity * unitPrice for all items', () => {
    expect(invoiceTotal([{ quantity: 2, unitPrice: 150 }, { quantity: 1, unitPrice: 300 }])).toBe(600)
  })

  it('returns zero for empty items', () => {
    expect(invoiceTotal([])).toBe(0)
  })
})

describe('billingSummary', () => {
  const invoices: Invoice[] = [
    {
      id: 1, patientId: 101, patientName: 'A', date: '2026-07-01',
      items: [{ description: 'Consult', quantity: 1, unitPrice: 300 }],
      status: 'paid', paidAmount: 300,
    },
    {
      id: 2, patientId: 102, patientName: 'B', date: '2026-07-02',
      items: [{ description: 'Test', quantity: 1, unitPrice: 200 }],
      status: 'unpaid', paidAmount: 0,
    },
    {
      id: 3, patientId: 103, patientName: 'C', date: '2026-07-03',
      items: [{ description: 'X', quantity: 1, unitPrice: 400 }],
      status: 'partial', paidAmount: 150,
    },
  ]

  it('computes revenue, outstanding, and counts', () => {
    const result = billingSummary(invoices)
    expect(result.totalRevenue).toBe(300)
    expect(result.outstanding).toBe(450)
    expect(result.paidCount).toBe(1)
    expect(result.unpaidCount).toBe(1)
    expect(result.partialCount).toBe(1)
  })

  it('returns zeros for empty invoices', () => {
    const result = billingSummary([])
    expect(result.totalRevenue).toBe(0)
    expect(result.outstanding).toBe(0)
  })
})

describe('pharmacySummary', () => {
  const medicines: Medicine[] = [
    { id: 1, name: 'A', category: 'Cat1', stock: 500, unitPrice: 1, expiryDate: '2027-01-01' },
    { id: 2, name: 'B', category: 'Cat1', stock: 50, unitPrice: 1, expiryDate: '2027-01-01' },
    { id: 3, name: 'C', category: 'Cat1', stock: 0, unitPrice: 1, expiryDate: '2027-01-01' },
  ]
  const orders: PharmacyOrder[] = [
    { id: 1, patientId: 101, patientName: 'P', medicineId: 1, medicineName: 'A', quantity: 10, date: '2026-07-18', status: 'pending' },
    { id: 2, patientId: 102, patientName: 'Q', medicineId: 2, medicineName: 'B', quantity: 5, date: '2026-07-18', status: 'dispensed' },
  ]

  it('counts stock levels and order statuses', () => {
    const result = pharmacySummary(medicines, orders)
    expect(result.totalMedicines).toBe(3)
    expect(result.outOfStock).toBe(1)
    expect(result.lowStock).toBe(1)
    expect(result.pendingOrders).toBe(1)
    expect(result.dispensedOrders).toBe(1)
  })
})

describe('labSummary', () => {
  const tests: LabTest[] = [
    { id: 1, patientId: 101, patientName: 'A', testName: 'CBC', category: 'Hem', date: '2026-07-18', status: 'completed', result: 'OK' },
    { id: 2, patientId: 102, patientName: 'B', testName: 'Lipid', category: 'Card', date: '2026-07-18', status: 'in-progress' },
    { id: 3, patientId: 103, patientName: 'C', testName: 'IgE', category: 'Imm', date: '2026-07-18', status: 'ordered' },
    { id: 4, patientId: 104, patientName: 'D', testName: 'X', category: 'Other', date: '2026-07-18', status: 'cancelled' },
  ]

  it('counts statuses and computes completion rate', () => {
    const result = labSummary(tests)
    expect(result.total).toBe(4)
    expect(result.completed).toBe(1)
    expect(result.inProgress).toBe(1)
    expect(result.ordered).toBe(1)
    expect(result.cancelled).toBe(1)
    expect(result.completionRate).toBe(25)
  })

  it('handles empty array', () => {
    const result = labSummary([])
    expect(result.total).toBe(0)
    expect(result.completionRate).toBe(0)
  })
})

describe('monthlyRevenueTrend', () => {
  it('returns 6 months ending current month', () => {
    const result = monthlyRevenueTrend([])
    expect(result).toHaveLength(6)
  })

  it('aggregates paid invoice revenue by month', () => {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const invoices: Invoice[] = [
      {
        id: 1, patientId: 101, patientName: 'A', date: `${monthKey}-15`,
        items: [{ description: 'X', quantity: 1, unitPrice: 500 }],
        status: 'paid', paidAmount: 500,
      },
      {
        id: 2, patientId: 102, patientName: 'B', date: `${monthKey}-10`,
        items: [{ description: 'Y', quantity: 1, unitPrice: 300 }],
        status: 'unpaid', paidAmount: 0,
      },
    ]
    const result = monthlyRevenueTrend(invoices)
    const lastMonth = result[result.length - 1]
    expect(lastMonth.revenue).toBe(500)
  })
})
