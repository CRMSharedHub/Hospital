import { Menu, Search, User } from 'lucide-react'
import { useI18n } from '../i18n'
import NotificationPanel from './NotificationPanel'
import RoleBadge from './RoleBadge'
import { useAuthStore } from '../store/authStore'
import { useFacilities } from '../lib/api'
import { useFacilityStore } from '../store/facilityStore'
import { usePermission } from '../auth/usePermission'
import { OPEN_COMMAND_PALETTE_EVENT } from './CommandPalette'

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { t, lang, toggleLang } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { can } = usePermission()
  const { data: facilities = [] } = useFacilities()
  const activeFacilityId = useFacilityStore((s) => s.activeFacilityId)
  const setActiveFacilityId = useFacilityStore((s) => s.setActiveFacilityId)
  const showFacility = can('facilities:view') && facilities.length > 0

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-200">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          aria-label={t('openMenu')}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('welcome')}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('overview')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {showFacility && (
          <label htmlFor="facility-filter" className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('facilities')}</span>
            <select
              id="facility-filter"
              value={activeFacilityId ?? ''}
              onChange={(e) => {
                const v = e.target.value
                setActiveFacilityId(v ? Number(v) : null)
              }}
              aria-label={t('facilities')}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-800 dark:text-gray-100 max-w-[11rem]"
            >
              <option value="">{t('allFacilities')}</option>
              {facilities.filter((f) => f.active).map((f) => (
                <option key={f.id} value={f.id}>{f.code}</option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={openPalette}
          className="relative hidden sm:flex items-center gap-2 pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-primary-300 dark:hover:border-primary-700 w-48 md:w-64 text-start transition-colors"
          aria-label={t('search')}
        >
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="truncate flex-1">{t('search')}</span>
          <kbd className="hidden md:inline text-[10px] font-medium px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-400">
            Ctrl+K
          </kbd>
        </button>
        <button
          onClick={toggleLang}
          className="px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>
        <NotificationPanel />
        <div className="flex items-center gap-2">
          {user && <RoleBadge role={user.role} />}
          <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  )
}
