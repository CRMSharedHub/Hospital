import type { Appointment, Invoice, Medicine, PharmacyOrder, LabTest } from '../types'
import type { NotificationType } from '../types'
import { useNotificationStore } from '../store/notificationStore'
import { invoiceTotal } from './reports'
import { toDateKey } from './dashboard'

interface NotificationTemplate {
  type: NotificationType
  title: string
  message: string
  link?: string
}

function isToday(dateStr: string): boolean {
  return dateStr === toDateKey(new Date())
}

function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dateStr === toDateKey(tomorrow)
}

function isOverdue(dateStr: string): boolean {
  const target = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return target.getTime() < now.getTime()
}

export function generateNotifications(params: {
  appointments: Appointment[]
  invoices: Invoice[]
  medicines: Medicine[]
  pharmacyOrders: PharmacyOrder[]
  labTests: LabTest[]
}): void {
  const { appointments, invoices, medicines, pharmacyOrders, labTests } = params
  const store = useNotificationStore.getState()
  const templates: NotificationTemplate[] = []

  // Today's appointments (non-cancelled)
  for (const appt of appointments) {
    if (appt.status === 'cancelled') continue
    if (isToday(appt.date)) {
      templates.push({
        type: 'appointment_today',
        title: appt.patientName,
        message: `${appt.doctorName} — ${appt.time}`,
        link: '/appointments',
      })
    } else if (isTomorrow(appt.date)) {
      templates.push({
        type: 'appointment_upcoming',
        title: appt.patientName,
        message: `${appt.doctorName} — ${appt.date} ${appt.time}`,
        link: '/appointments',
      })
    }
  }

  // Overdue invoices
  for (const inv of invoices) {
    if (inv.status === 'paid') continue
    if (isOverdue(inv.date)) {
      const total = invoiceTotal(inv.items)
      const remaining = total - inv.paidAmount
      templates.push({
        type: 'invoice_overdue',
        title: `#${inv.id} — ${inv.patientName}`,
        message: `$${remaining.toFixed(2)}`,
        link: '/billing',
      })
    }
  }

  // Medicine stock alerts
  for (const med of medicines) {
    if (med.stock === 0) {
      templates.push({
        type: 'medicine_out_of_stock',
        title: med.name,
        message: med.category,
        link: '/pharmacy',
      })
    } else if (med.stock < 100) {
      templates.push({
        type: 'medicine_low_stock',
        title: med.name,
        message: `${med.stock}`,
        link: '/pharmacy',
      })
    }
  }

  // Pending pharmacy orders
  for (const order of pharmacyOrders) {
    if (order.status === 'pending') {
      templates.push({
        type: 'pharmacy_order_pending',
        title: order.medicineName,
        message: `${order.patientName} — ${order.quantity}`,
        link: '/pharmacy',
      })
    }
  }

  // Completed lab tests with results
  for (const test of labTests) {
    if (test.status === 'completed' && test.result) {
      templates.push({
        type: 'lab_result_ready',
        title: test.testName,
        message: test.patientName,
        link: '/lab',
      })
    }
  }

  // Add all to store (dedup is handled inside addNotification)
  for (const tmpl of templates) {
    store.addNotification(tmpl)
  }
}

export function unreadCount(): number {
  return useNotificationStore
    .getState()
    .notifications.filter((n) => !n.read).length
}
