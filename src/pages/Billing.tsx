import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, DollarSign, CreditCard, FileText } from 'lucide-react'
import { useInvoices, useUpdateInvoiceStatus } from '../lib/api'
import { createPaymentSession, confirmMockPayment } from '../lib/paymentsApi'
import { invoiceTotal, invoiceRemaining, formatMoney } from '../lib/billingMath'
import { useI18n, type TranslationKey } from '../i18n'
import type { Invoice } from '../types'
import StatCard from '../components/StatCard'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  unpaid: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  partial: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const filters = ['all', 'unpaid', 'partial', 'paid'] as const
type Filter = (typeof filters)[number]

export default function Billing() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: invoices = [] } = useInvoices()
  const updateStatusMutation = useUpdateInvoiceStatus()

  const [filter, setFilter] = useState<Filter>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [payingId, setPayingId] = useState<number | null>(null)

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)

  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + invoiceTotal(i), 0)
  const outstanding = invoices.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + invoiceRemaining(i), 0)
  const paidCount = invoices.filter((i) => i.status === 'paid').length

  const handleCollectPayment = async (inv: Invoice) => {
    setPayingId(inv.id)
    try {
      const session = await createPaymentSession(inv.id)
      if (session.provider === 'stripe' && session.checkoutUrl.startsWith('http')) {
        window.location.assign(session.checkoutUrl)
        return
      }
      const url = new URL(session.checkoutUrl, window.location.origin)
      const mockPay = url.searchParams.get('mockPay')
      if (mockPay) {
        await confirmMockPayment(Number(mockPay))
        toast.success(t('paymentSucceeded'))
        await queryClient.invalidateQueries({ queryKey: ['invoices'] })
        await queryClient.invalidateQueries({ queryKey: ['payments'] })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('billing')}</h2>
        <button
          type="button"
          onClick={() => navigate('/claims')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <FileText className="w-4 h-4" />
          {t('claims')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard icon={DollarSign} label={t('totalAmount')} value={formatMoney(totalRevenue)} colorClass="bg-emerald-500" />
        <StatCard icon={Receipt} label={t('remainingAmount')} value={formatMoney(outstanding)} colorClass="bg-red-500" />
        <StatCard icon={Receipt} label={t('completed')} value={String(paidCount)} colorClass="bg-primary-500" />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
          >
            {t(f as TranslationKey)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((inv) => {
          const total = invoiceTotal(inv)
          const remaining = invoiceRemaining(inv)
          const isExpanded = expandedId === inv.id

          return (
            <div key={inv.id} className="card">
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : inv.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {t('invoiceNumber')} #{inv.id}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{inv.patientName}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{inv.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-start sm:self-center">
                  <div className="text-end">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatMoney(total, inv.currency)}
                    </p>
                    {inv.status === 'partial' && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {t('remainingAmount')}: {formatMoney(remaining, inv.currency)}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusStyles[inv.status]}`}>
                    {t(inv.status as TranslationKey)}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 dark:text-gray-400">
                        <th className="text-start font-medium pb-2">{t('description')}</th>
                        <th className="text-center font-medium pb-2">{t('quantity')}</th>
                        <th className="text-center font-medium pb-2">{t('unitPrice')}</th>
                        <th className="text-end font-medium pb-2">{t('subtotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.items.map((item, idx) => (
                        <tr key={idx} className="text-gray-700 dark:text-gray-300">
                          <td className="py-2">{item.description}</td>
                          <td className="text-center py-2">{item.quantity}</td>
                          <td className="text-center py-2">{formatMoney(item.unitPrice, inv.currency)}</td>
                          <td className="text-end py-2">
                            {formatMoney(item.quantity * item.unitPrice, inv.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-100 dark:border-gray-700">
                        <td colSpan={3} className="py-2 text-end font-medium text-gray-500 dark:text-gray-400">
                          {t('totalAmount')}:
                        </td>
                        <td className="py-2 text-end font-bold text-gray-900 dark:text-white">
                          {formatMoney(total, inv.currency)}
                        </td>
                      </tr>
                      {inv.paidAmount > 0 && (
                        <tr>
                          <td colSpan={3} className="py-1 text-end text-sm text-gray-500 dark:text-gray-400">
                            {t('paidAmount')}:
                          </td>
                          <td className="py-1 text-end text-sm text-emerald-600 dark:text-emerald-400">
                            {formatMoney(inv.paidAmount, inv.currency)}
                          </td>
                        </tr>
                      )}
                      {remaining > 0 && (
                        <tr>
                          <td colSpan={3} className="py-1 text-end text-sm text-gray-500 dark:text-gray-400">
                            {t('remainingAmount')}:
                          </td>
                          <td className="py-1 text-end text-sm text-red-600 dark:text-red-400">
                            {formatMoney(remaining, inv.currency)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>

                  {inv.status !== 'paid' && (
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleCollectPayment(inv)
                        }}
                        disabled={payingId === inv.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <CreditCard className="w-4 h-4" />
                        {t('payNow')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('/claims')
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <FileText className="w-4 h-4" />
                        {t('createClaimFromInvoice')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateStatusMutation.mutate({ id: inv.id, status: 'paid', paidAmount: total })
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                      >
                        {t('markAsPaid')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">{t('noInvoices')}</p>
        )}
      </div>
    </div>
  )
}
