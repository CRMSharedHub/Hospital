import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, CreditCard, FlaskConical, Pill, Printer, Receipt, HeartPulse, ListChecks, ClipboardList } from 'lucide-react'
import {
  usePatientInvoices,
  usePayments,
  usePatientAppointments,
  usePatientLabTests,
  usePatientMedications,
  usePatientVitalSigns,
  usePatientProblems,
  useClinicalOrders,
} from '../lib/api'
import { createPaymentSession, confirmMockPayment } from '../lib/paymentsApi'
import { invoiceRemaining, invoiceTotal, formatMoney } from '../lib/billingMath'
import { formatBp } from '../lib/clinicalChart'
import { useAuthStore } from '../store/authStore'
import { useI18n, type TranslationKey } from '../i18n'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { Invoice } from '../types'

type Tab = 'bills' | 'appointments' | 'records'

export default function Portal() {
  const { t } = useI18n()
  const user = useAuthStore((s) => s.user)
  const patientId = user?.linkedPatientId
  const { data: invoices = [], isLoading } = usePatientInvoices(patientId)
  const { data: payments = [] } = usePayments({ patientId })
  const { data: appointments = [] } = usePatientAppointments(patientId)
  const { data: labs = [] } = usePatientLabTests(patientId)
  const { data: meds = [] } = usePatientMedications(patientId)
  const { data: vitals = [] } = usePatientVitalSigns(patientId)
  const { data: problems = [] } = usePatientProblems(patientId)
  const { data: clinicalOrders = [] } = useClinicalOrders({ patientId: patientId })
  const [searchParams, setSearchParams] = useSearchParams()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('bills')
  const queryClient = useQueryClient()

  const balanceDue = useMemo(
    () => invoices.reduce((sum, inv) => sum + invoiceRemaining(inv), 0),
    [invoices],
  )

  useEffect(() => {
    const mockPay = searchParams.get('mockPay')
    if (!mockPay) return
    const paymentId = Number(mockPay)
    if (!paymentId) return

    void (async () => {
      try {
        await confirmMockPayment(paymentId)
        toast.success(t('paymentSucceeded'))
        await queryClient.invalidateQueries({ queryKey: ['invoices'] })
        await queryClient.invalidateQueries({ queryKey: ['payments'] })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Payment failed')
      } finally {
        searchParams.delete('mockPay')
        searchParams.delete('invoice')
        setSearchParams(searchParams, { replace: true })
      }
    })()
  }, [searchParams, setSearchParams, queryClient, t])

  useEffect(() => {
    if (searchParams.get('paid') === '1') {
      toast.success(t('paymentSucceeded'))
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      searchParams.delete('paid')
      searchParams.delete('invoice')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, queryClient, t])

  const handlePay = async (inv: Invoice) => {
    setPayingId(inv.id)
    try {
      const session = await createPaymentSession(inv.id)
      if (session.provider === 'stripe' && session.checkoutUrl.startsWith('http')) {
        window.location.assign(session.checkoutUrl)
        return
      }
      const url = new URL(session.checkoutUrl, window.location.origin)
      setSearchParams(url.searchParams)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPayingId(null)
    }
  }

  if (!patientId) {
    return (
      <div className="card p-6">
        <p className="text-gray-500 dark:text-gray-400">
          {t('accessDenied')} — linked patient required
        </p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof Receipt }[] = [
    { id: 'bills', label: t('myBills'), icon: Receipt },
    { id: 'appointments', label: t('appointments'), icon: CalendarDays },
    { id: 'records', label: t('myRecords'), icon: FlaskConical },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:block">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('portal')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('patientStatement')}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Link
            to="/messages"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('messages')}
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Printer className="w-4 h-4" />
            {t('printStatement')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('balanceDue')}</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {formatMoney(balanceDue)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('myBills')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{invoices.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === item.id
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'bills' && (
        <div className="space-y-4">
          {isLoading && <p className="text-gray-400">{t('syncing')}</p>}
          {!isLoading && invoices.length === 0 && (
            <p className="text-center text-gray-400 py-8">{t('noInvoices')}</p>
          )}
          {invoices.map((inv) => {
            const total = invoiceTotal(inv)
            const remaining = invoiceRemaining(inv)
            const isExpanded = expandedId === inv.id
            return (
              <div key={inv.id} className="card">
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer p-1"
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {t('invoiceNumber')} #{inv.id}
                      </h4>
                      <p className="text-sm text-gray-500">{inv.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatMoney(total, inv.currency)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {t(inv.status)}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                    <ul className="text-sm space-y-1">
                      {inv.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between text-gray-700 dark:text-gray-300">
                          <span>
                            {item.description} × {item.quantity}
                          </span>
                          <span>{formatMoney(item.quantity * item.unitPrice, inv.currency)}</span>
                        </li>
                      ))}
                    </ul>
                    {remaining > 0 && (
                      <div className="flex justify-end print:hidden">
                        <button
                          type="button"
                          disabled={payingId === inv.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handlePay(inv)
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                        >
                          <CreditCard className="w-4 h-4" />
                          {t('payNow')} — {formatMoney(remaining, inv.currency)}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="space-y-3 print:hidden">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('paymentHistory')}</h3>
            {payments.length === 0 && <p className="text-gray-400 text-sm">{t('noPayments')}</p>}
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center text-sm card px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t('invoiceNumber')} #{p.invoiceId}
                  </p>
                  <p className="text-gray-500">
                    {p.provider} · {p.status} · {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(p.amount, p.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'appointments' && (
        <div className="space-y-3">
          {appointments.length === 0 && (
            <p className="text-center text-gray-400 py-8">{t('noAppointments')}</p>
          )}
          {appointments.map((a) => (
            <div key={a.id} className="card p-4 flex justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{a.doctorName}</p>
                <p className="text-sm text-gray-500">
                  {a.date} {a.time}
                </p>
              </div>
              <span className="text-xs px-2 py-1 h-fit rounded-lg bg-gray-100 dark:bg-gray-700">
                {t(a.status)}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'records' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> {t('orders')}
            </h3>
            {clinicalOrders.length === 0 && <p className="text-sm text-gray-400">{t('noOrders')}</p>}
            <div className="space-y-2">
              {clinicalOrders.map((o) => (
                <div key={o.id} className="card p-3 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{o.description}</p>
                  <p className="text-gray-500">
                    {t(o.orderType as TranslationKey)} · {t(o.status as TranslationKey)} · {new Date(o.orderedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <HeartPulse className="w-4 h-4" /> {t('vitals')}
            </h3>
            {vitals.length === 0 && <p className="text-sm text-gray-400">{t('noRecords')}</p>}
            <div className="space-y-2">
              {vitals.map((v) => (
                <div key={v.id} className="card p-3 text-sm">
                  <p className="text-gray-500">{new Date(v.recordedAt).toLocaleString()}</p>
                  <p className="text-gray-800 dark:text-gray-100">
                    {t('temperatureC')}: {v.temperatureC ?? '—'} · {t('heartRate')}: {v.heartRate ?? '—'} ·{' '}
                    {t('bloodPressure')}: {formatBp(v)} · {t('spo2')}: {v.spo2 != null ? `${v.spo2}%` : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <ListChecks className="w-4 h-4" /> {t('problemList')}
            </h3>
            {problems.length === 0 && <p className="text-sm text-gray-400">{t('noRecords')}</p>}
            <div className="space-y-2">
              {problems.map((p) => (
                <div key={p.id} className="card p-3 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {p.display}{p.code ? ` (${p.code})` : ''}
                  </p>
                  <p className="text-gray-500">{t(p.status as TranslationKey)}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> {t('lab')}
            </h3>
            {labs.length === 0 && <p className="text-sm text-gray-400">{t('noLabTests')}</p>}
            <div className="space-y-2">
              {labs.map((lab) => (
                <div key={lab.id} className="card p-3 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{lab.testName}</p>
                  <p className="text-gray-500">
                    {lab.date} · {lab.status}
                  </p>
                  {lab.result && <p className="mt-1 text-gray-700 dark:text-gray-300">{lab.result}</p>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Pill className="w-4 h-4" /> {t('medications')}
            </h3>
            {meds.length === 0 && <p className="text-sm text-gray-400">{t('noMedications')}</p>}
            <div className="space-y-2">
              {meds.map((m) => (
                <div key={m.id} className="card p-3 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                  <p className="text-gray-500">
                    {m.dosage} · {m.startDate}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
