import { Shield, Stethoscope, HeartPulse, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '../auth/permissions'
import { useI18n, type TranslationKey } from '../i18n'

const roleConfig: Record<Role, { icon: LucideIcon; color: string; key: TranslationKey }> = {
  admin: { icon: Shield, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', key: 'role_admin' },
  doctor: { icon: Stethoscope, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', key: 'role_doctor' },
  nurse: { icon: HeartPulse, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', key: 'role_nurse' },
  patient: { icon: User, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', key: 'role_patient' },
}

export default function RoleBadge({ role, size = 'sm' }: { role: Role; size?: 'sm' | 'md' }) {
  const { t } = useI18n()
  const config = roleConfig[role]
  const Icon = config.icon
  const sizeClass = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClass}`}>
      <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />
      {t(config.key)}
    </span>
  )
}
