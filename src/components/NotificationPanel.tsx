import { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCheck, Trash2, CalendarDays, DollarSign, Pill, FlaskConical, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../store/notificationStore'
import { useI18n, type TranslationKey } from '../i18n'
import type { NotificationType } from '../types'

const typeIcons: Record<NotificationType, LucideIcon> = {
  appointment_today: CalendarDays,
  appointment_upcoming: CalendarDays,
  invoice_overdue: DollarSign,
  medicine_low_stock: Package,
  medicine_out_of_stock: Pill,
  lab_result_ready: FlaskConical,
  pharmacy_order_pending: Pill,
}

const typeColors: Record<NotificationType, string> = {
  appointment_today: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  appointment_upcoming: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  invoice_overdue: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  medicine_low_stock: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  medicine_out_of_stock: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  lab_result_ready: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  pharmacy_order_pending: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
}

const typeLabels: Record<NotificationType, TranslationKey> = {
  appointment_today: 'todayAppointments',
  appointment_upcoming: 'upcomingAppointments',
  invoice_overdue: 'overdueInvoices',
  medicine_low_stock: 'lowStock',
  medicine_out_of_stock: 'outOfStock',
  lab_result_ready: 'labResultsReady',
  pharmacy_order_pending: 'pendingOrders',
}

function timeAgo(iso: string, lang: 'ar' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return lang === 'ar' ? 'الآن' : 'just now'
  if (mins < 60) return lang === 'ar' ? `قبل ${mins} دقيقة` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang === 'ar' ? `قبل ${hours} ساعة` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return lang === 'ar' ? `قبل ${days} يوم` : `${days}d ago`
}

export default function NotificationPanel() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotificationStore()
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id)
    if (link) {
      navigate(link)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        aria-label={isOpen ? t('closeNotifications') : t('openNotifications')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center" role="status" aria-live="polite">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 max-h-[70vh] flex flex-col" role="dialog" aria-label={t('notifications')}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('notifications')}</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t('markAllRead')}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title={t('clearAll')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">{t('noNotifications')}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcons[n.type]
                const colorClass = typeColors[n.type]
                const labelKey = typeLabels[n.type]

                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group ${!n.read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                    onClick={() => handleNotificationClick(n.id, n.link)}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                          {t(labelKey)}
                        </span>
                        {!n.read && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.message}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(n.createdAt, lang)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeNotification(n.id)
                      }}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
