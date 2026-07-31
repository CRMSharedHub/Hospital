import { LucideIcon } from 'lucide-react'

export default function StatCard({ icon: Icon, label, value, trend, colorClass }: { icon: LucideIcon, label: string, value: string, trend?: string, colorClass: string }) {
  return (
    <div className="card flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${trend.startsWith('+') ? 'text-success' : 'text-danger'}`}>
            {trend} <span className="text-gray-400 dark:text-gray-500 font-normal">from last month</span>
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  )
}
