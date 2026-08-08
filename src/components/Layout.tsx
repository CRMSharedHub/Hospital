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
import { WifiOff } from 'lucide-react'

export default function Layout() {
  const { t } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isOnline = useOnlineStatus()
  const { data: appointments = [] } = useAppointments()
  const { data: invoices = [] } = useInvoices()
  const { data: medicines = [] } = useMedicines()
  const { data: pharmacyOrders = [] } = usePharmacyOrders()
  const { data: labTests = [] } = useLabTests()

  useEffect(() => {
    generateNotifications({ appointments, invoices, medicines, pharmacyOrders, labTests })
  }, [appointments, invoices, medicines, pharmacyOrders, labTests])

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
        {!isOnline && (
          <div
            role="status"
            className="bg-amber-500 text-white px-4 py-2 text-sm flex items-center gap-2 justify-center"
          >
            <WifiOff className="w-4 h-4 shrink-0" />
            {t('offlineLimited')}
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
