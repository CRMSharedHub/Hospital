import { CalendarDays, Users, Stethoscope } from 'lucide-react'
import StatCard from '../components/StatCard'
import AppointmentsTable from '../components/AppointmentsTable'
import { useI18n, type TranslationKey } from '../i18n'
import { useAppointments, useDoctors, usePatients } from '../lib/api'
import { activityBarPercent, countAppointmentsOn, toDateKey, weeklyActivity } from '../lib/dashboard'
import type { LucideIcon } from 'lucide-react'

function StatSkeleton() {
  return (
    <div className="card animate-pulse flex items-start justify-between" aria-hidden="true">
      <div className="space-y-2 flex-1">
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}

export default function Dashboard() {
  const { t, lang } = useI18n()
  const { data: appointments = [], isLoading: loadingAppts, isFetching: fetchingAppts } = useAppointments()
  const { data: patients = [], isLoading: loadingPatients, isFetching: fetchingPatients } = usePatients()
  const { data: doctors = [], isLoading: loadingDoctors, isFetching: fetchingDoctors } = useDoctors()

  const isBootstrapping =
    (loadingAppts || loadingPatients || loadingDoctors) ||
    ((fetchingAppts || fetchingPatients || fetchingDoctors) &&
      appointments.length === 0 &&
      patients.length === 0 &&
      doctors.length === 0)

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
    <div className="space-y-6" aria-busy={isBootstrapping}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {isBootstrapping
          ? [1, 2, 3].map((id) => <StatSkeleton key={id} />)
          : stats.map((stat) => (
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
          {isBootstrapping ? (
            <div className="card h-64 animate-pulse bg-gray-100 dark:bg-gray-800" aria-label={t('loading')} />
          ) : (
            <AppointmentsTable appointments={appointments} />
          )}
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('weeklyActivity')}</h3>
          </div>
          {isBootstrapping ? (
            <div className="flex-1 flex items-end justify-between gap-3 h-64" aria-hidden="true">
              {[40, 65, 30, 80, 55, 45, 70].map((h, i) => (
                <div key={i} className="flex-1 flex items-end justify-center h-full">
                  <div
                    className="w-full max-w-[32px] rounded-t-lg bg-gray-200 dark:bg-gray-700 animate-pulse"
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}
