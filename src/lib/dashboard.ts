import type { Appointment } from '../types'

export interface DailyActivity {
  date: string
  count: number
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function countAppointmentsOn(appointments: Appointment[], dateKey: string): number {
  return appointments.filter((a) => a.date === dateKey && a.status !== 'cancelled').length
}

export function weeklyActivity(
  appointments: Appointment[],
  today: Date,
  days = 7,
): DailyActivity[] {
  const result: DailyActivity[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
    const key = toDateKey(day)
    result.push({ date: key, count: countAppointmentsOn(appointments, key) })
  }
  return result
}

export function activityBarPercent(count: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((count / max) * 100)
}
