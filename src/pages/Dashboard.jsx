import { CalendarDays, Users, Stethoscope, DollarSign, TrendingUp } from 'lucide-react'
import { stats as rawStats } from '../data/mockData'
import StatCard from '../components/StatCard'
import AppointmentsTable from '../components/AppointmentsTable'
import { useI18n } from '../i18n'
import { useData } from '../DataContext'

const iconMap = {
  CalendarDays,
  Users,
  Stethoscope,
  DollarSign,
}

const activity = [
  { day: 'Sat', height: 'h-16' },
  { day: 'Sun', height: 'h-24' },
  { day: 'Mon', height: 'h-20' },
  { day: 'Tue', height: 'h-32' },
  { day: 'Wed', height: 'h-28' },
  { day: 'Thu', height: 'h-36' },
  { day: 'Fri', height: 'h-20' },
]

export default function Dashboard() {
  const { t, lang } = useI18n()
  const { appointments } = useData()

  const stats = rawStats.map((s) => ({ ...s, icon: iconMap[s.icon] }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            icon={stat.icon}
            label={t(stat.labelKey)}
            value={stat.value}
            trend={stat.trend}
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
            <h3 className="font-semibold text-gray-900">
              {lang === 'ar' ? 'نشاط الأسبوع' : 'Weekly Activity'}
            </h3>
            <span className="text-xs text-success flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +14%
            </span>
          </div>
          <div className="flex-1 flex items-end justify-between gap-3 h-64">
            {activity.map((bar) => (
              <div key={bar.day} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 opacity-90 hover:opacity-100 transition-all ${bar.height}`}
                />
                <span className="text-xs text-gray-500">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
