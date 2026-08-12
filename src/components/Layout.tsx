import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { Outlet } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import ConsentBanner from './ConsentBanner'
import { useAppointments, useInvoices, useMedicines, usePharmacyOrders, useLabTests } from '../lib/api'
import { generateNotifications } from '../lib/notificationEngine'
import { useI18n } from '../i18n'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useOfflineQueueCounts } from '../lib/useOfflineQueueCounts'
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'

export default function Layout() {
  const { t } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isOnline = useOnlineStatus()
  const { pending, conflict, totalOpen } = useOfflineQueueCounts()
  const { data: appointments = [] } = useAppointments()
  const { data: invoices = [] } = useInvoices()
  const { data: medicines = [] } = useMedicines()
  const { data: pharmacyOrders = [] } = usePharmacyOrders()
  const { data: labTests = [] } = useLabTests()

  useEffect(() => {
    generateNotifications({ appointments, invoices, medicines, pharmacyOrders, labTests })
  }, [appointments, invoices, medicines, pharmacyOrders, labTests])

  const showOffline = !isOnline
  const showQueue = isOnline && totalOpen > 0
  const bannerVisible = showOffline || showQueue

  let bannerText = t('offlineLimited')
  let BannerIcon = WifiOff
  let bannerClass = 'bg-amber-500 text-white'

  if (showOffline && pending > 0) {
    bannerText = t('offlineQueued').replace('{n}', String(pending))
  } else if (showQueue && conflict > 0) {
    bannerText = t('offlineConflict').replace('{n}', String(conflict))
    BannerIcon = AlertTriangle
    bannerClass = 'bg-orange-600 text-white'
  } else if (showQueue) {
    bannerText = t('offlineSyncPending').replace('{n}', String(totalOpen))
    BannerIcon = RefreshCw
    bannerClass = 'bg-sky-600 text-white'
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:text-sm"
      >
        {t('skipToContent')}
      </a>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col transition-all duration-300 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {bannerVisible && (
          <div
            role="status"
            className={`${bannerClass} px-4 py-2 text-sm flex items-center gap-2 justify-center`}
          >
            <BannerIcon className="w-4 h-4 shrink-0" />
            {bannerText}
          </div>
        )}
        <main id="main-content" className="flex-1 p-6 overflow-auto" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <ConsentBanner />
    </div>
  )
}
