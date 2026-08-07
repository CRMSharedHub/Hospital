import { ShieldCheck } from 'lucide-react'
import { useComplianceAttestations, useUpdateCompliance } from '../lib/api'
import { describeKmsStatus } from '../lib/kms'
import { detectComplianceHints } from '../lib/complianceAuto'
import { useI18n } from '../i18n'
import type { ComplianceStatus } from '../types'
import { toast } from 'sonner'

const statusTone: Record<ComplianceStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  done: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  na: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const STATUS_RANK: Record<ComplianceStatus, number> = {
  pending: 0,
  in_progress: 1,
  done: 2,
  na: 0,
}

export default function Compliance() {
  const { t } = useI18n()
  const { data: items = [] } = useComplianceAttestations()
  const update = useUpdateCompliance()
  const kms = describeKmsStatus()
  const hints = detectComplianceHints()

  const done = items.filter((i) => i.status === 'done').length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  const applyAutoHints = () => {
    let n = 0
    for (const item of items) {
      const hint = hints.find((h) => h.key === item.key)
      if (!hint) continue
      if (STATUS_RANK[hint.suggestedStatus] > STATUS_RANK[item.status]) {
        update.mutate({ id: item.id, status: hint.suggestedStatus, notes: hint.reason })
        n += 1
      }
    }
    toast.success(n ? `Updated ${n} item(s) from auto-detect` : 'Nothing to upgrade')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('compliance')}</h2>
            <p className="text-sm text-gray-500">{t('complianceHint')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={applyAutoHints}
          className="px-4 py-2 text-sm rounded-lg border border-emerald-300 text-emerald-800 dark:text-emerald-300 dark:border-emerald-700"
        >
          {t('applyComplianceAuto')}
        </button>
      </div>

      <div className="card p-4 text-sm space-y-2">
        <p className="font-medium text-gray-900 dark:text-white">{t('liveChecklist')}</p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
          <li>
            <a className="text-primary-600 underline" href="/docs/ops/LIVE_CHECKLIST.md" onClick={(e) => e.preventDefault()}>
              docs/ops/LIVE_CHECKLIST.md
            </a>
            {' '}(MFA · PITR · SSO · deploy)
          </li>
          <li>docs/compliance/BAA_CHECKLIST.md</li>
          <li>docs/compliance/BREACH_PLAYBOOK.md</li>
          <li>docs/compliance/WORKFORCE_TRAINING.md</li>
        </ul>
        <p className="text-xs text-gray-400">Open these paths in the repo — mark checklist items done after real sign-off.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">{t('complianceProgress')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pct}%</p>
          <p className="text-xs text-gray-400 mt-1">{done}/{items.length} {t('done')}</p>
        </div>
        <div className="card p-4 sm:col-span-2">
          <p className="text-sm text-gray-500">{t('kmsStatus')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
            {kms.provider} · {kms.keyId}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {kms.configured ? t('kmsConfigured') : t('kmsStub')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const hint = hints.find((h) => h.key === item.key)
          return (
            <div key={item.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-gray-400 mt-1">{item.key}</p>
                {hint && (
                  <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                    Auto: {hint.suggestedStatus} — {hint.reason}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusTone[item.status]}`}>
                  {item.status}
                </span>
                {(['pending', 'in_progress', 'done', 'na'] as ComplianceStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={update.isPending || item.status === s}
                    onClick={() => update.mutate({ id: item.id, status: s })}
                    className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
