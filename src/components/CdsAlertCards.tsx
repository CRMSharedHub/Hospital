import { AlertTriangle } from 'lucide-react'
import type { CdsAlert } from '../lib/cdsTypes'
import { translate, type Language } from '../i18n'

export interface CdsAlertCardsProps {
  alerts: CdsAlert[]
  locale: Language
}

function isHighRisk(alert: CdsAlert): boolean {
  return alert.severity === 'major' || alert.kind === 'allergy'
}

export default function CdsAlertCards({ alerts, locale }: CdsAlertCardsProps) {
  if (!alerts.length) return null

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        {translate('cdsAlertsTitle', locale)}
      </h4>
      {alerts.map((alert, index) => {
        const high = isHighRisk(alert)
        const message = locale === 'ar' ? alert.messageAr : alert.messageEn
        const action = locale === 'ar' ? alert.actionAr : alert.actionEn
        const severityLabel =
          alert.severity === 'major'
            ? translate('cdsSeverityMajor', locale)
            : translate('cdsSeverityModerate', locale)
        const kindLabel =
          alert.kind === 'allergy'
            ? translate('cdsKindAllergy', locale)
            : translate('cdsKindDrugDrug', locale)
        const borderClass = high
          ? alert.kind === 'allergy'
            ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
            : 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/25'
          : 'border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10'

        return (
          <div
            key={`${alert.kind}-${alert.category}-${alert.ruleId ?? index}`}
            className={`rounded-lg border-2 p-3 text-sm space-y-2 ${borderClass}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  alert.severity === 'major'
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100'
                }`}
              >
                {severityLabel}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                {kindLabel}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {translate('cdsCategory', locale)}: {alert.category}
              </span>
              {alert.withDrug && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {alert.withDrug}
                </span>
              )}
            </div>
            <p className="text-amber-950 dark:text-amber-100">{message}</p>
            {action && (
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <span className="font-medium">{translate('cdsSuggestedAction', locale)}:</span>{' '}
                {action}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
