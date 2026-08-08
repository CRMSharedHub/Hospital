import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  Building2,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import { useI18n, type TranslationKey } from '../i18n'
import type { LucideIcon } from 'lucide-react'
import { usePermission } from '../auth/usePermission'
import type { Permission } from '../auth/permissions'

type NavItem = { to: string; icon: LucideIcon; key: TranslationKey; permission: Permission }
type NavGroupId = 'overview' | 'clinical' | 'finance' | 'ops' | 'admin'

const NAV_GROUPS: {
  id: NavGroupId
  labelKey: TranslationKey
  items: NavItem[]
}[] = [
  {
    id: 'overview',
    labelKey: 'navGroupOverview',
    items: [{ to: '/', icon: LayoutDashboard, key: 'dashboard', permission: 'dashboard:view' }],
  },
  {
    id: 'clinical',
    labelKey: 'navGroupClinical',
    items: [
      { to: '/patients', icon: Users, key: 'patients', permission: 'patients:view' },
      { to: '/doctors', icon: Stethoscope, key: 'doctors', permission: 'doctors:view' },
      { to: '/appointments', icon: CalendarDays, key: 'appointments', permission: 'appointments:view' },
      { to: '/census', icon: BedDouble, key: 'census', permission: 'census:view' },
      { to: '/orders', icon: ClipboardList, key: 'orders', permission: 'orders:view' },
      { to: '/emar', icon: Syringe, key: 'emar', permission: 'emar:view' },
      { to: '/lab', icon: FlaskConical, key: 'lab', permission: 'lab:view' },
      { to: '/pharmacy', icon: Pill, key: 'pharmacy', permission: 'pharmacy:view' },
    ],
  },
  {
    id: 'finance',
    labelKey: 'navGroupFinance',
    items: [
      { to: '/billing', icon: Receipt, key: 'billing', permission: 'billing:view' },
      { to: '/claims', icon: FileText, key: 'claims', permission: 'claims:view' },
      { to: '/portal', icon: CreditCard, key: 'portal', permission: 'portal:view' },
    ],
  },
  {
    id: 'ops',
    labelKey: 'navGroupOps',
    items: [
      { to: '/messages', icon: MessageSquare, key: 'messages', permission: 'messages:view' },
      { to: '/interop', icon: Cable, key: 'interop', permission: 'interop:view' },
      { to: '/facilities', icon: Building2, key: 'facilities', permission: 'facilities:view' },
      { to: '/compliance', icon: ShieldCheck, key: 'compliance', permission: 'compliance:view' },
    ],
  },
  {
    id: 'admin',
    labelKey: 'navGroupAdmin',
    items: [
      { to: '/reports', icon: BarChart3, key: 'reports', permission: 'reports:view' },
      { to: '/audit-log', icon: ScrollText, key: 'auditLog', permission: 'auditLog:view' },
      { to: '/settings', icon: Settings, key: 'settings', permission: 'settings:view' },
    ],
  },
]

const COLLAPSE_KEY = 'sidebar-nav-collapsed'

function readCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, lang } = useI18n()
  const { can } = usePermission()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed)

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => can(item.permission)),
  })).filter((g) => g.items.length > 0)

  useEffect(() => {
    const path = location.pathname
    setCollapsed((prev) => {
      let next = prev
      for (const g of groups) {
        const active = g.items.some(
          (item) => item.to === '/' ? path === '/' : path === item.to || path.startsWith(`${item.to}/`),
        )
        if (active && prev[g.id]) {
          if (next === prev) next = { ...prev }
          next[g.id] = false
        }
      }
      if (next !== prev) {
        try {
          localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
      }
      return next
    })
    // Only re-expand when route changes; groups identity changes with role but that is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: path-driven expand
  }, [location.pathname])

  const toggleGroup = (id: NavGroupId) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

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
        aria-label={t('appName')}
        className={`fixed lg:static top-0 bottom-0 z-50 w-64 bg-primary-900 dark:bg-gray-900 text-white transition-transform duration-300 border-e border-transparent dark:border-gray-800 flex flex-col
          ${lang === 'ar' ? 'right-0' : 'left-0'}
          ${isOpen ? 'translate-x-0' : lang === 'ar' ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-primary-700/40 dark:border-gray-800 shrink-0">
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

        <nav aria-label={t('mainNavigation')} className="p-3 space-y-1 overflow-y-auto flex-1">
          {groups.map((group) => {
            const isCollapsed = Boolean(collapsed[group.id])
            const showHeading = group.id !== 'overview' || group.items.length > 1
            return (
              <div key={group.id} className="space-y-0.5">
                {showHeading && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isCollapsed}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary-200/80 hover:text-white"
                  >
                    <span>{t(group.labelKey)}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? (lang === 'ar' ? 'rotate-90' : '-rotate-90') : ''}`}
                    />
                  </button>
                )}
                {!isCollapsed &&
                  group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${isActive
                          ? 'bg-white/10 text-accent-400 font-medium'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{t(item.key)}</span>
                    </NavLink>
                  ))}
              </div>
            )
          })}
          <p className="px-3 pt-3 pb-1 text-[10px] text-primary-300/70">
            {t('commandPaletteShortcut')}
          </p>
        </nav>
      </aside>
    </>
  )
}
