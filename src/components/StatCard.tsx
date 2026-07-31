import type { LucideIcon } from 'lucide-react'

export interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  colorClass: string
}

export default function StatCard({ icon: Icon, label, value, colorClass }: StatCardProps) {
  return (
    <div className="card flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  )
}
