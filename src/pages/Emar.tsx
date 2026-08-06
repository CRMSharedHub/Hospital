import { useMemo, useState } from 'react'
import { Syringe, Clock, CheckCircle2 } from 'lucide-react'
import {
  useMarEntries,
  useScheduleMar,
  useUpdateMarStatus,
  usePatients,
} from '../lib/api'
import { countDueMar, countPendingMar } from '../lib/emar'
import { useI18n, type TranslationKey } from '../i18n'
import { usePermission } from '../auth/usePermission'
import { useAuthStore } from '../store/authStore'
import type { MarStatus } from '../types'
import StatCard from '../components/StatCard'

const statusStyles: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  given: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  held: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  refused: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  missed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
}

export default function Emar() {
  const { t } = useI18n()
  const { can } = usePermission()
  const canEdit = can('emar:edit')
  const userName = useAuthStore((s) => s.user?.name)

  const { data: entries = [] } = useMarEntries()
  const { data: patients = [] } = usePatients()
  const schedule = useScheduleMar()
  const updateStatus = useUpdateMarStatus()

  const [filter, setFilter] = useState<'all' | MarStatus | 'due'>('all')
  const [patientId, setPatientId] = useState('')
  const [medicineName, setMedicineName] = useState('')
  const [dose, setDose] = useState('')
  const [route, setRoute] = useState('oral')
  const [scheduledAt, setScheduledAt] = useState('')
  const [nowMs] = useState(() => Date.now())

  const dueCount = countDueMar(entries, new Date(nowMs))
  const pending = countPendingMar(entries)

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter === 'due') return e.status === 'scheduled' && new Date(e.scheduledAt).getTime() <= nowMs
      if (filter === 'all') return true
      return e.status === filter
    })
  }, [entries, filter, nowMs])

  const handleSchedule = () => {
    const patient = patients.find((p) => p.id === Number(patientId))
    if (!patient || !medicineName.trim() || !dose.trim()) return
    schedule.mutate({
      patientId: patient.id,
      patientName: patient.name,
      medicineName: medicineName.trim(),
      dose: dose.trim(),
      route,
      scheduledAt: scheduledAt
        ? new Date(scheduledAt).toISOString()
        : new Date(nowMs + 60 * 60 * 1000).toISOString(),
    })
    setMedicineName('')
    setDose('')
    setScheduledAt('')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('emar')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Syringe} label={t('totalMar')} value={String(entries.length)} colorClass="bg-primary-500" />
        <StatCard icon={Clock} label={t('dueNow')} value={String(dueCount)} colorClass="bg-amber-500" />
        <StatCard icon={CheckCircle2} label={t('pendingDoses')} value={String(pending)} colorClass="bg-blue-500" />
      </div>

      {canEdit && (
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('scheduleDose')}</h3>
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
              <span className="text-gray-500">{t('medicationName')}</span>
              <input value={medicineName} onChange={(e) => setMedicineName(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-gray-500">{t('dose')}</span>
              <input value={dose} onChange={(e) => setDose(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-gray-500">{t('route')}</span>
              <select value={route} onChange={(e) => setRoute(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
                <option value="oral">{t('routeOral')}</option>
                <option value="IV">{t('routeIv')}</option>
                <option value="IM">{t('routeIm')}</option>
                <option value="topical">{t('routeTopical')}</option>
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-gray-500">{t('scheduledAt')}</span>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
            </label>
          </div>
          <button type="button" onClick={handleSchedule} disabled={schedule.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {t('scheduleDose')}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'due', 'scheduled', 'given', 'held', 'refused', 'missed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
          >
            {f === 'all' ? t('all') : f === 'due' ? t('dueNow') : t(f as TranslationKey)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((e) => {
          const isDue = e.status === 'scheduled' && new Date(e.scheduledAt).getTime() <= nowMs
          return (
            <div key={e.id} className={`card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDue ? 'ring-1 ring-amber-400' : ''}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{e.medicineName}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusStyles[e.status]}`}>{t(e.status as TranslationKey)}</span>
                  {isDue && <span className="text-xs text-amber-600 font-medium">{t('dueNow')}</span>}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {e.patientName} · {e.dose} · {e.route} · {new Date(e.scheduledAt).toLocaleString()}
                  {e.administeredBy ? ` · ${e.administeredBy}` : ''}
                </p>
              </div>
              {canEdit && e.status === 'scheduled' && (
                <div className="flex flex-wrap gap-2">
                  {(['given', 'held', 'refused', 'missed'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateStatus.mutate({ id: e.id, status: s, administeredBy: userName })}
                      className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600"
                    >
                      {t(s as TranslationKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">{t('noMar')}</p>}
      </div>
    </div>
  )
}
