import { useState } from 'react'
import { FlaskConical, Microscope, CheckCircle2 } from 'lucide-react'
import { useLabTests, useUpdateLabTestStatus } from '../lib/api'
import { useI18n, type TranslationKey } from '../i18n'
import { labResultSchema } from '../lib/validation'
import type { LabTest } from '../types'
import StatCard from '../components/StatCard'

const statusStyles: Record<string, string> = {
  ordered: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'in-progress': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const filters = ['all', 'ordered', 'in-progress', 'completed', 'cancelled'] as const
type Filter = (typeof filters)[number]

export default function Lab() {
  const { t } = useI18n()
  const { data: labTests = [] } = useLabTests()
  const updateStatusMutation = useUpdateLabTestStatus()

  const [filter, setFilter] = useState<Filter>('all')
  const [resultModalId, setResultModalId] = useState<number | null>(null)
  const [resultText, setResultText] = useState('')
  const [resultError, setResultError] = useState('')

  const filtered = filter === 'all' ? labTests : labTests.filter((t) => t.status === filter)

  const completed = labTests.filter((t) => t.status === 'completed').length
  const inProgress = labTests.filter((t) => t.status === 'in-progress').length
  const ordered = labTests.filter((t) => t.status === 'ordered').length

  const handleSaveResult = () => {
    const result = labResultSchema.safeParse({ result: resultText })
    if (!result.success) {
      setResultError(result.error.issues[0]?.message ?? 'Result required')
      return
    }
    setResultError('')
    if (resultModalId !== null) {
      updateStatusMutation.mutate({ id: resultModalId, status: 'completed', result: resultText })
      setResultModalId(null)
      setResultText('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('lab')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard icon={FlaskConical} label={t('ordered')} value={String(ordered)} colorClass="bg-blue-500" />
        <StatCard icon={Microscope} label={t('inProgress')} value={String(inProgress)} colorClass="bg-amber-500" />
        <StatCard icon={CheckCircle2} label={t('completed')} value={String(completed)} colorClass="bg-emerald-500" />
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
        {filtered.map((test: LabTest) => (
          <div key={test.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{test.testName}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('patient')}: {test.patientName}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {test.category} — {test.date}
                </p>
                {test.result && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-md">
                    <span className="font-medium">{t('testResult')}:</span> {test.result}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              {test.status === 'ordered' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: test.id, status: 'in-progress' })}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-xs font-medium"
                >
                  {t('inProgress')}
                </button>
              )}
              {test.status === 'in-progress' && (
                <button
                  onClick={() => {
                    setResultModalId(test.id)
                    setResultText(test.result || '')
                  }}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
                >
                  {t('enterResult')}
                </button>
              )}
              <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusStyles[test.status]}`}>
                {t(test.status as TranslationKey)}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">{t('noLabTests')}</p>
        )}
      </div>

      {resultModalId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setResultModalId(null)}>
          <div className="card max-w-lg w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('enterResult')}</h3>
            <textarea
              value={resultText}
              onChange={(e) => { setResultText(e.target.value); setResultError('') }}
              rows={4}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${resultError ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
              placeholder={t('testResult')}
            />
            {resultError && <p className="text-xs text-red-600">{resultError}</p>}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResultModalId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveResult}
                disabled={!resultText.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
