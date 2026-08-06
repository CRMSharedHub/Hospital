import type { Appointment, Invoice, Medicine, PharmacyOrder, LabTest, Doctor } from '../types'
import { toDateKey, weeklyActivity } from './dashboard'

// ── Appointment stats ────────────────────────────────────
export interface AppointmentStatusBreakdown {
  status: Appointment['status']
  count: number
  percent: number
}

export function appointmentStatusBreakdown(appointments: Appointment[]): AppointmentStatusBreakdown[] {
  const total = appointments.length
  const statuses: Appointment['status'][] = ['confirmed', 'pending', 'completed', 'cancelled']
  return statuses.map((status) => {
    const count = appointments.filter((a) => a.status === status).length
    return { status, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 }
  })
}

// ── Doctor workload ──────────────────────────────────────
export interface DoctorWorkload {
  doctorId: number
  doctorName: string
  appointmentCount: number
}

export function doctorWorkload(appointments: Appointment[], doctors: Doctor[]): DoctorWorkload[] {
  return doctors
    .map((doc) => ({
      doctorId: doc.id,
      doctorName: doc.name,
      appointmentCount: appointments.filter((a) => a.doctorId === doc.id).length,
    }))
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
}

// ── Billing stats ────────────────────────────────────────
export interface BillingSummary {
  totalRevenue: number
  outstanding: number
  paidCount: number
  unpaidCount: number
  partialCount: number
}

export function invoiceTotal(items: { quantity: number; unitPrice: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

export function billingSummary(invoices: Invoice[]): BillingSummary {
  let totalRevenue = 0
  let outstanding = 0
  let paidCount = 0
  let unpaidCount = 0
  let partialCount = 0

  for (const inv of invoices) {
    const total = invoiceTotal(inv.items)
    if (inv.status === 'paid') {
      totalRevenue += total
      paidCount++
    } else {
      outstanding += total - inv.paidAmount
      if (inv.status === 'unpaid') unpaidCount++
      else if (inv.status === 'partial') partialCount++
    }
  }

  return { totalRevenue, outstanding, paidCount, unpaidCount, partialCount }
}

// ── Pharmacy stats ───────────────────────────────────────
export interface PharmacySummary {
  totalMedicines: number
  outOfStock: number
  lowStock: number
  pendingOrders: number
  dispensedOrders: number
}

export function pharmacySummary(medicines: Medicine[], orders: PharmacyOrder[]): PharmacySummary {
  return {
    totalMedicines: medicines.length,
    outOfStock: medicines.filter((m) => m.stock === 0).length,
    lowStock: medicines.filter((m) => m.stock > 0 && m.stock < 100).length,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    dispensedOrders: orders.filter((o) => o.status === 'dispensed').length,
  }
}

// ── Lab stats ────────────────────────────────────────────
export interface LabSummary {
  total: number
  ordered: number
  inProgress: number
  completed: number
  cancelled: number
  completionRate: number
}

export function labSummary(tests: LabTest[]): LabSummary {
  const total = tests.length
  const ordered = tests.filter((t) => t.status === 'ordered').length
  const inProgress = tests.filter((t) => t.status === 'in-progress').length
  const completed = tests.filter((t) => t.status === 'completed').length
  const cancelled = tests.filter((t) => t.status === 'cancelled').length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, ordered, inProgress, completed, cancelled, completionRate }
}

// ── Monthly revenue trend ────────────────────────────────
export interface MonthlyRevenue {
  month: string
  revenue: number
}

export function monthlyRevenueTrend(invoices: Invoice[], months = 6): MonthlyRevenue[] {
  const now = new Date()
  const result: MonthlyRevenue[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const revenue = invoices
      .filter((inv) => inv.date.startsWith(monthKey) && inv.status === 'paid')
      .reduce((sum, inv) => sum + invoiceTotal(inv.items), 0)
    result.push({ month: monthKey, revenue })
  }

  return result
}

// ── Weekly appointment activity (re-exported) ────────────
export { weeklyActivity, toDateKey }
