import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Settings,
  X,
  Activity,
} from 'lucide-react'
import { useI18n } from '../i18n'

const navItems = [
  { to: '/', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/patients', icon: Users, key: 'patients' },
  { to: '/doctors', icon: Stethoscope, key: 'doctors' },
  { to: '/appointments', icon: CalendarDays, key: 'appointments' },
  { to: '/settings', icon: Settings, key: 'settings' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { t, lang } = useI18n()

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:static top-0 bottom-0 z-50 w-64 bg-primary-900 text-white transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0
          ${lang === 'en' ? 'right-0 lg:right-auto' : 'right-0'}`}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-primary-700/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Activity className="w-6 h-6 text-accent-500" />
            </div>
            <span className="font-bold text-lg">{t('appName')}</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
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
