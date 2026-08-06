import { describe, expect, it, beforeEach } from 'vitest'
import { generateNotifications } from './notificationEngine'
import { useNotificationStore } from '../store/notificationStore'
import type { Appointment, Invoice, Medicine, PharmacyOrder, LabTest } from '../types'

const today = new Date()
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
const pastDate = '2020-01-01'

const makeAppt = (id: number, date: string, status: Appointment['status'] = 'confirmed'): Appointment => ({
  id, patientId: 100 + id, doctorId: 1, patientName: `P${id}`, doctorName: 'Dr. A', date, time: '09:00', status,
})

const makeInvoice = (id: number, status: Invoice['status'], date: string): Invoice => ({
  id, patientId: 101, patientName: 'A', date,
  items: [{ description: 'Consult', quantity: 1, unitPrice: 300 }],
  status, paidAmount: status === 'paid' ? 300 : 0,
})

const makeMedicine = (id: number, stock: number): Medicine => ({
  id, name: `Med${id}`, category: 'Cat', stock, unitPrice: 1, expiryDate: '2027-01-01',
})

const makeOrder = (id: number, status: PharmacyOrder['status']): PharmacyOrder => ({
  id, patientId: 101, patientName: 'P', medicineId: 1, medicineName: 'A', quantity: 5, date: todayKey, status,
})

const makeLabTest = (id: number, status: LabTest['status'], result?: string): LabTest => ({
  id, patientId: 101, patientName: 'P', testName: 'CBC', category: 'Hem', date: todayKey, status, result,
})

describe('generateNotifications', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll()
  })

  it('generates appointment_today for today\'s non-cancelled appointments', () => {
    generateNotifications({
      appointments: [makeAppt(1, todayKey, 'confirmed'), makeAppt(2, todayKey, 'cancelled')],
      invoices: [], medicines: [], pharmacyOrders: [], labTests: [],
    })
    const notifs = useNotificationStore.getState().notifications
    expect(notifs.some((n) => n.type === 'appointment_today')).toBe(true)
    expect(notifs.filter((n) => n.type === 'appointment_today')).toHaveLength(1)
  })

  it('generates appointment_upcoming for tomorrow\'s appointments', () => {
    generateNotifications({
      appointments: [makeAppt(1, tomorrowKey)],
      invoices: [], medicines: [], pharmacyOrders: [], labTests: [],
    })
    const notifs = useNotificationStore.getState().notifications
    expect(notifs.some((n) => n.type === 'appointment_upcoming')).toBe(true)
  })

  it('generates invoice_overdue for unpaid past-due invoices', () => {
    generateNotifications({
      appointments: [],
      invoices: [makeInvoice(1, 'unpaid', pastDate), makeInvoice(2, 'paid', pastDate)],
      medicines: [], pharmacyOrders: [], labTests: [],
    })
    const notifs = useNotificationStore.getState().notifications
    const overdue = notifs.filter((n) => n.type === 'invoice_overdue')
    expect(overdue).toHaveLength(1)
  })

  it('generates medicine_out_of_stock for zero stock', () => {
    generateNotifications({
      appointments: [],
      invoices: [],
      medicines: [makeMedicine(1, 0), makeMedicine(2, 500)],
      pharmacyOrders: [], labTests: [],
    })
    const notifs = useNotificationStore.getState().notifications
    expect(notifs.some((n) => n.type === 'medicine_out_of_stock')).toBe(true)
    expect(notifs.some((n) => n.type === 'medicine_low_stock')).toBe(false)
  })

  it('generates medicine_low_stock for stock below 100', () => {
    generateNotifications({
      appointments: [],
      invoices: [],
      medicines: [makeMedicine(1, 50)],
      pharmacyOrders: [], labTests: [],
    })
    const notifs = useNotificationStore.getState().notifications
    expect(notifs.some((n) => n.type === 'medicine_low_stock')).toBe(true)
  })

  it('generates pharmacy_order_pending for pending orders', () => {
    generateNotifications({
      appointments: [],
      invoices: [],
      medicines: [],
      pharmacyOrders: [makeOrder(1, 'pending'), makeOrder(2, 'dispensed')],
      labTests: [],
    })
    const notifs = useNotificationStore.getState().notifications
    expect(notifs.filter((n) => n.type === 'pharmacy_order_pending')).toHaveLength(1)
  })

  it('generates lab_result_ready for completed tests with results', () => {
    generateNotifications({
      appointments: [],
      invoices: [],
      medicines: [],
      pharmacyOrders: [],
      labTests: [makeLabTest(1, 'completed', 'Normal'), makeLabTest(2, 'completed', undefined), makeLabTest(3, 'in-progress')],
    })
    const notifs = useNotificationStore.getState().notifications
    expect(notifs.filter((n) => n.type === 'lab_result_ready')).toHaveLength(1)
  })

  it('does not generate duplicate notifications on repeated calls', () => {
    const params = {
      appointments: [makeAppt(1, todayKey)],
      invoices: [], medicines: [makeMedicine(1, 0)], pharmacyOrders: [], labTests: [],
    }
    generateNotifications(params)
    generateNotifications(params)
    const notifs = useNotificationStore.getState().notifications
    expect(notifs.filter((n) => n.type === 'appointment_today')).toHaveLength(1)
    expect(notifs.filter((n) => n.type === 'medicine_out_of_stock')).toHaveLength(1)
  })

  it('includes link in notifications', () => {
    generateNotifications({
      appointments: [makeAppt(1, todayKey)],
      invoices: [], medicines: [], pharmacyOrders: [], labTests: [],
    })
    const notif = useNotificationStore.getState().notifications.find((n) => n.type === 'appointment_today')
    expect(notif?.link).toBe('/appointments')
  })
})
