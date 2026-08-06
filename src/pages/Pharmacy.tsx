import { useState } from 'react'
import { Pill, Package, AlertTriangle } from 'lucide-react'
import { useMedicines, usePharmacyOrders, useUpdatePharmacyOrderStatus } from '../lib/api'
import { useI18n, type TranslationKey } from '../i18n'
import type { PharmacyOrder } from '../types'
import StatCard from '../components/StatCard'

const orderStatusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  dispensed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

type Tab = 'inventory' | 'orders'

export default function Pharmacy() {
  const { t } = useI18n()
  const { data: medicines = [] } = useMedicines()
  const { data: orders = [] } = usePharmacyOrders()
  const updateOrderStatus = useUpdatePharmacyOrderStatus()

  const [tab, setTab] = useState<Tab>('inventory')
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'dispensed' | 'cancelled'>('all')

  const totalMedicines = medicines.length
  const outOfStock = medicines.filter((m) => m.stock === 0).length
  const lowStock = medicines.filter((m) => m.stock > 0 && m.stock < 100).length

  const filteredOrders = orderFilter === 'all' ? orders : orders.filter((o) => o.status === orderFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('pharmacy')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard icon={Package} label={t('medicines')} value={String(totalMedicines)} colorClass="bg-primary-500" />
        <StatCard icon={AlertTriangle} label={t('lowStock')} value={String(lowStock)} colorClass="bg-amber-500" />
        <StatCard icon={AlertTriangle} label={t('outOfStock')} value={String(outOfStock)} colorClass="bg-red-500" />
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('inventory')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'inventory' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          {t('medicines')}
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'orders' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          {t('pharmacyOrders')}
        </button>
      </div>

      {tab === 'inventory' ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="text-start font-medium py-3 px-2">{t('medicine')}</th>
                <th className="text-start font-medium py-3 px-2">{t('category')}</th>
                <th className="text-center font-medium py-3 px-2">{t('stock')}</th>
                <th className="text-center font-medium py-3 px-2">{t('unitPrice')}</th>
                <th className="text-center font-medium py-3 px-2">{t('expiryDate')}</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => {
                const stockLabel = med.stock === 0 ? t('outOfStock') : med.stock < 100 ? t('lowStock') : t('inStock')
                const stockColor = med.stock === 0
                  ? 'text-red-600 dark:text-red-400'
                  : med.stock < 100
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'

                return (
                  <tr key={med.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{med.name}</td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{med.category}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-xs font-medium ${stockColor}`}>{stockLabel}</span>
                      <span className="block text-xs text-gray-400 dark:text-gray-500">{med.stock} {t('quantity')}</span>
                    </td>
                    <td className="py-3 px-2 text-center text-gray-600 dark:text-gray-300">${med.unitPrice.toFixed(2)}</td>
                    <td className="py-3 px-2 text-center text-gray-500 dark:text-gray-400">{med.expiryDate}</td>
                  </tr>
                )
              })}
              {medicines.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8">{t('noMedicines')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'dispensed', 'cancelled'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${orderFilter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
              >
                {t(f as TranslationKey)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order: PharmacyOrder) => (
              <div key={order.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{order.medicineName}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('patient')}: {order.patientName}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      {t('quantity')}: {order.quantity} — {order.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'dispensed' })}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
                    >
                      {t('dispense')}
                    </button>
                  )}
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${orderStatusStyles[order.status]}`}>
                    {t(order.status as TranslationKey)}
                  </span>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <p className="text-center text-gray-400 py-8">{t('noOrders')}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
