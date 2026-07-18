import { useState } from 'react'
import { Bell, Moon, Globe, User, LogOut } from 'lucide-react'
import { useI18n } from '../i18n'

export default function Settings() {
  const { t, lang, toggleLang } = useI18n()
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t('settings')}</h2>

      <div className="card space-y-6">
        <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
          <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
            <Globe className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{t('language')}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'تغيير لغة واجهة النظام' : 'Change the interface language'}
            </p>
            <button
              onClick={toggleLang}
              className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('notifications')}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {lang === 'ar' ? 'استقبال تنبيهات المواعيد والرسائل' : 'Receive appointment and message alerts'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotifications((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-primary-600' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                notifications ? (lang === 'ar' ? 'right-1' : 'left-7') : (lang === 'ar' ? 'left-1' : 'left-1')
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('darkMode')}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {lang === 'ar' ? 'تفعيل المظهر الداكن' : 'Enable dark theme'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                darkMode ? (lang === 'ar' ? 'right-1' : 'left-7') : (lang === 'ar' ? 'left-1' : 'left-1')
              }`}
            />
          </button>
        </div>

        <div className="flex items-start gap-4 pt-2">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{t('profile')}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Admin · admin@cityhospital.com
            </p>
            <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
