import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Settings,
  X,
  Activity,
  Receipt,
  Pill,
  FlaskConical,
  BedDouble,
  ClipboardList,
  Syringe,
  BarChart3,
  ScrollText,
  FileText,
  CreditCard,
  Cable,
  MessageSquare,
} from 'lucide-react'
import { useI18n, type TranslationKey } from '../i18n'
import type { LucideIcon } from 'lucide-react'
import { usePermission } from '../auth/usePermission'
import type { Permission } from '../auth/permissions'

const navItems: { to: string; icon: LucideIcon; key: TranslationKey; permission: Permission }[] = [
  { to: '/', icon: LayoutDashboard, key: 'dashboard', permission: 'dashboard:view' },
  { to: '/patients', icon: Users, key: 'patients', permission: 'patients:view' },
  { to: '/doctors', icon: Stethoscope, key: 'doctors', permission: 'doctors:view' },
  { to: '/appointments', icon: CalendarDays, key: 'appointments', permission: 'appointments:view' },
  { to: '/billing', icon: Receipt, key: 'billing', permission: 'billing:view' },
  { to: '/claims', icon: FileText, key: 'claims', permission: 'claims:view' },
  { to: '/portal', icon: CreditCard, key: 'portal', permission: 'portal:view' },
  { to: '/messages', icon: MessageSquare, key: 'messages', permission: 'messages:view' },
  { to: '/interop', icon: Cable, key: 'interop', permission: 'interop:view' },
  { to: '/pharmacy', icon: Pill, key: 'pharmacy', permission: 'pharmacy:view' },
  { to: '/lab', icon: FlaskConical, key: 'lab', permission: 'lab:view' },
  { to: '/census', icon: BedDouble, key: 'census', permission: 'census:view' },
  { to: '/orders', icon: ClipboardList, key: 'orders', permission: 'orders:view' },
  { to: '/emar', icon: Syringe, key: 'emar', permission: 'emar:view' },
  { to: '/reports', icon: BarChart3, key: 'reports', permission: 'reports:view' },
  { to: '/audit-log', icon: ScrollText, key: 'auditLog', permission: 'auditLog:view' },
  { to: '/settings', icon: Settings, key: 'settings', permission: 'settings:view' },
]

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, lang } = useI18n()
  const { can } = usePermission()
  const visibleItems = navItems.filter((item) => can(item.permission))

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        role="navigation"
        aria-label={t('mainNavigation')}
        className={`fixed lg:static top-0 bottom-0 z-50 w-64 bg-primary-900 dark:bg-gray-900 text-white transition-transform duration-300 border-e border-transparent dark:border-gray-800
          ${lang === 'ar' ? 'right-0' : 'left-0'}
          ${isOpen ? 'translate-x-0' : lang === 'ar' ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-primary-700/40 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Activity className="w-6 h-6 text-accent-500" />
            </div>
            <span className="font-bold text-lg">{t('appName')}</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded" aria-label={t('closeMenu')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                  ? 'bg-white/10 text-accent-400 font-medium'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
