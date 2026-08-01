import { useState } from 'react'
import { Bell, Moon, Sun, Globe, User, LogOut } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { t, lang, toggleLang } = useI18n()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(true)
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const darkMode = theme === 'dark'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('settings')}</h2>

      <div className="card space-y-6">
        {/* Language */}
        <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            <Globe className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('language')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('languageDescription')}
            </p>
            <button
              onClick={toggleLang}
              className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {t('switchLanguage')}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('notifications')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('notificationsDescription')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotifications((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'
                } ${lang === 'ar' && !notifications ? '-translate-x-1' : ''}`}
            />
          </button>
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              {darkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('darkMode')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('darkModeDescription')}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'
                } ${lang === 'ar' && !darkMode ? '-translate-x-1' : ''}`}
            />
          </button>
        </div>

        {/* Profile */}
        <div className="flex items-start gap-4 pt-2">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('profile')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {user?.name} · {user?.email}
            </p>
            <button onClick={handleLogout} className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
