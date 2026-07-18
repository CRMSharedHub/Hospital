import { Bell, Menu, Search, User } from 'lucide-react'
import { useI18n } from '../i18n'

export default function Header({ onMenuClick }) {
  const { t, lang, toggleLang } = useI18n()

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{t('welcome')}</h1>
          <p className="text-xs text-gray-500 hidden sm:block">{t('overview')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('search')}
            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48 md:w-64"
          />
        </div>
        <button
          onClick={toggleLang}
          className="px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
      </div>
    </header>
  )
}
