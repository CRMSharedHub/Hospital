import { useMemo, useState } from 'react'
import { ClipboardList, AlertTriangle } from 'lucide-react'
import {
  useClinicalOrders,
  usePlaceClinicalOrder,
  useUpdateClinicalOrderStatus,
  usePatients,
  useMedicines,
} from '../lib/api'
import { countOpenOrders } from '../lib/cpoe'
import { clinicalOrderSchema } from '../lib/validation'
import { CdsAckRequiredError, requiresOverrideReason } from '../lib/cdsEngine'
import type { CdsAlert } from '../lib/cdsTypes'
import { useI18n, type TranslationKey } from '../i18n'
import { usePermission } from '../auth/usePermission'
import { useAuthStore } from '../store/authStore'
import type { ClinicalOrder, ClinicalOrderType, ClinicalOrderPriority } from '../types'
import StatCard from '../components/StatCard'
import CdsAlertCards from '../components/CdsAlertCards'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  ordered: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'in-progress': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const priorityStyles: Record<string, string> = {
  routine: 'text-gray-500',
  urgent: 'text-amber-600 dark:text-amber-400 font-semibold',
  stat: 'text-red-600 dark:text-red-400 font-semibold',
}

function isCdsAckRequiredError(error: unknown): error is CdsAckRequiredError {
  return (
    error instanceof CdsAckRequiredError ||
    (error instanceof Error &&
      error.name === 'CdsAckRequiredError' &&
      Array.isArray((error as CdsAckRequiredError).alerts))
  )
}

export default function Orders() {
  const { t, lang } = useI18n()
  const { can } = usePermission()
  const canEdit = can('orders:edit')
  const userName = useAuthStore((s) => s.user?.name)

  const { data: orders = [] } = useClinicalOrders()
  const { data: patients = [] } = usePatients()
  const { data: medicines = [] } = useMedicines()
  const placeOrder = usePlaceClinicalOrder()
  const updateStatus = useUpdateClinicalOrderStatus()

  const [typeFilter, setTypeFilter] = useState<'all' | ClinicalOrderType>('all')
  const [patientId, setPatientId] = useState('')
  const [orderType, setOrderType] = useState<ClinicalOrderType>('lab')
  const [priority, setPriority] = useState<ClinicalOrderPriority>('routine')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [medicineId, setMedicineId] = useState('')
  const [quantity, setQuantity] = useState('30')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState('')
  const [pendingAlerts, setPendingAlerts] = useState<CdsAlert[] | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  const filtered = useMemo(
    () => (typeFilter === 'all' ? orders : orders.filter((o) => o.orderType === typeFilter)),
    [orders, typeFilter],
  )
  const openCount = countOpenOrders(orders)
  const needsOverrideReason = Boolean(pendingAlerts && requiresOverrideReason(pendingAlerts))
  const canAcknowledge =
    !needsOverrideReason || overrideReason.trim().length >= 5

  const buildPayload = (acknowledgeCds?: boolean) => {
    const patient = patients.find((p) => p.id === Number(patientId))
    if (!patient) throw new Error('Patient required')
    const parsed = clinicalOrderSchema.safeParse({
      patientId: patient.id,
      orderType,
      priority,
      description: orderType === 'pharmacy'
        ? medicines.find((m) => m.id === Number(medicineId))?.name ?? description
        : description,
      code: code || undefined,
      medicineId: orderType === 'pharmacy' ? Number(medicineId) : undefined,
      quantity: orderType === 'pharmacy' ? Number(quantity) || 1 : undefined,
      notes: notes || undefined,
    })
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Invalid order')
    }
    return {
      patientId: patient.id,
      patientName: patient.name,
      orderType: parsed.data.orderType,
      priority: parsed.data.priority,
      description: parsed.data.description,
      code: parsed.data.code,
      medicineId: parsed.data.medicineId,
      quantity: parsed.data.quantity,
      orderedBy: userName,
      notes: parsed.data.notes,
      acknowledgeCds,
      cdsOverrideReason: overrideReason.trim() || undefined,
    }
  }

  const submit = async (acknowledgeCds?: boolean) => {
    setFormError('')
    try {
      const payload = buildPayload(acknowledgeCds)
      await placeOrder.mutateAsync(payload)
      setPendingAlerts(null)
      setOverrideReason('')
      setDescription('')
      setCode('')
      setNotes('')
      setMedicineId('')
    } catch (e) {
      if (isCdsAckRequiredError(e)) {
        setPendingAlerts(e.alerts)
        return
      }
      setFormError(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('orders')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={ClipboardList} label={t('totalOrders')} value={String(orders.length)} colorClass="bg-primary-500" />
        <StatCard icon={ClipboardList} label={t('openOrders')} value={String(openCount)} colorClass="bg-amber-500" />
        <StatCard
          icon={AlertTriangle}
          label={t('allergyAlerts')}
          value={String(orders.filter((o) => o.allergyAlert).length)}
          colorClass="bg-red-500"
        />
      </div>

      {canEdit && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('newOrder')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-gray-500">{t('patients')}</span>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
                <option value="">—</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-gray-500">{t('orderType')}</span>
              <select value={orderType} onChange={(e) => setOrderType(e.target.value as ClinicalOrderType)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
                {(['lab', 'pharmacy', 'imaging', 'nursing', 'other'] as const).map((ty) => (
                  <option key={ty} value={ty}>{t(ty as TranslationKey)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-gray-500">{t('priority')}</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as ClinicalOrderPriority)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
                {(['routine', 'urgent', 'stat'] as const).map((p) => (
                  <option key={p} value={p}>{t(p as TranslationKey)}</option>
                ))}
              </select>
            </label>
            {orderType === 'pharmacy' ? (
              <>
                <label className="text-sm space-y-1">
                  <span className="text-gray-500">{t('medicines')}</span>
                  <select value={medicineId} onChange={(e) => setMedicineId(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
                    <option value="">—</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-gray-500">{t('quantity')}</span>
                  <input value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
                </label>
              </>
            ) : (
              <>
                <label className="text-sm space-y-1 sm:col-span-2">
                  <span className="text-gray-500">{t('orderDescription')}</span>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-gray-500">{t('orderCode')}</span>
                  <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" placeholder="LOINC / CPT" />
                </label>
              </>
            )}
            <label className="text-sm space-y-1 sm:col-span-2 lg:col-span-3">
              <span className="text-gray-500">{t('clinicalNotes')}</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
            </label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {pendingAlerts && (
            <div className="space-y-3 rounded-lg border border-amber-300 dark:border-amber-700 p-3">
              <CdsAlertCards alerts={pendingAlerts} locale={lang} />
              {needsOverrideReason && (
                <label className="block text-sm space-y-1">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">{t('cdsOverrideReason')}</span>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                    placeholder={t('cdsOverrideReasonHint')}
                  />
                  <span className="text-xs text-gray-500">{t('cdsOverrideReasonHint')}</span>
                </label>
              )}
              <button
                type="button"
                disabled={!canAcknowledge || placeOrder.isPending}
                onClick={() => void submit(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm disabled:opacity-50"
              >
                {t('cdsAcknowledgeAndPlace')}
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={placeOrder.isPending}
            onClick={() => void submit(false)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {t('placeOrder')}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'lab', 'pharmacy', 'imaging', 'nursing', 'other'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTypeFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${typeFilter === f ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
          >
            {f === 'all' ? t('all') : t(f as TranslationKey)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((o: ClinicalOrder) => (
          <div key={o.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">{o.description}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${statusStyles[o.status]}`}>{t(o.status as TranslationKey)}</span>
                <span className={`text-xs ${priorityStyles[o.priority]}`}>{t(o.priority as TranslationKey)}</span>
                <span className="text-xs text-gray-500">{t(o.orderType as TranslationKey)}</span>
              </div>
              <p className="text-sm text-gray-500">
                {o.patientName} · {new Date(o.orderedAt).toLocaleString()}
                {o.orderedBy ? ` · ${o.orderedBy}` : ''}
                {o.code ? ` · ${o.code}` : ''}
              </p>
              {o.allergyAlert && (
                <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {o.allergyAlert}
                </p>
              )}
              {o.cdsOverrideReason && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('cdsOverrideReason')}: {o.cdsOverrideReason}
                </p>
              )}
            </div>
            {canEdit && (o.status === 'ordered' || o.status === 'in-progress') && (
              <div className="flex flex-wrap gap-2">
                {o.status === 'ordered' && (
                  <button type="button" onClick={() => updateStatus.mutate({ id: o.id, status: 'in-progress' })} className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                    {t('inProgress')}
                  </button>
                )}
                <button type="button" onClick={() => updateStatus.mutate({ id: o.id, status: 'completed' })} className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                  {t('completed')}
                </button>
                <button type="button" onClick={() => updateStatus.mutate({ id: o.id, status: 'cancelled' })} className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                  {t('cancelled')}
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">{t('noOrders')}</p>}
      </div>
    </div>
  )
}
