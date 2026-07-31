import { CalendarDays, Users, Stethoscope } from 'lucide-react'
import StatCard from '../components/StatCard'
import AppointmentsTable from '../components/AppointmentsTable'
import { useI18n, type TranslationKey } from '../i18n'
import { useAppointments, useDoctors, usePatients } from '../lib/api'
import { activityBarPercent, countAppointmentsOn, toDateKey, weeklyActivity } from '../lib/dashboard'
import type { LucideIcon } from 'lucide-react'

export default function Dashboard() {
  const { t, lang } = useI18n()
  const { data: appointments = [] } = useAppointments()
  const { data: patients = [] } = usePatients()
  const { data: doctors = [] } = useDoctors()

  const today = new Date()
  const activity = weeklyActivity(appointments, today)
  const maxCount = activity.reduce((max, day) => Math.max(max, day.count), 0)
  const dayFormatter = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    weekday: 'short',
  })

  const stats: { id: number; labelKey: TranslationKey; value: string; icon: LucideIcon; color: string }[] = [
    {
      id: 1,
      labelKey: 'todayAppointments',
      value: String(countAppointmentsOn(appointments, toDateKey(today))),
      icon: CalendarDays,
      color: 'bg-primary-500',
    },
    {
      id: 2,
      labelKey: 'totalPatients',
      value: String(patients.length),
      icon: Users,
      color: 'bg-accent-500',
    },
    {
      id: 3,
      labelKey: 'totalDoctors',
      value: String(doctors.length),
      icon: Stethoscope,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            icon={stat.icon}
            label={t(stat.labelKey)}
            value={stat.value}
            colorClass={stat.color}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AppointmentsTable appointments={appointments} />
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('weeklyActivity')}</h3>
          </div>
          <div className="flex-1 flex items-end justify-between gap-3 h-64">
            {activity.map((bar) => (
              <div key={bar.date} className="flex flex-col items-center gap-2 flex-1 h-full">
                <div className="flex-1 w-full flex items-end justify-center">
                  <div
                    title={`${bar.date}: ${bar.count}`}
                    style={{ height: `${activityBarPercent(bar.count, maxCount)}%` }}
                    className="w-full max-w-[32px] min-h-[2px] rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 opacity-90 hover:opacity-100 transition-all"
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {dayFormatter.format(new Date(`${bar.date}T00:00:00`))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
