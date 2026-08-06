import { useState, useEffect } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { useConsentStore, type ConsentType } from '../store/consentStore'
import { useI18n } from '../i18n'

const CONSENT_LABELS: Record<ConsentType, { ar: string; en: string }> = {
  data_processing: { ar: 'معالجة البيانات الطبية', en: 'Medical data processing' },
  marketing: { ar: 'رسائل ترويجية', en: 'Marketing communications' },
  analytics: { ar: 'تحليلات الأداء', en: 'Performance analytics' },
  third_party_share: { ar: 'مشاركة مع أطراف ثالثة', en: 'Third-party data sharing' },
}

export default function ConsentBanner() {
  const { lang } = useI18n()
  const { consents, grantAll, revokeAll, grant, revoke } = useConsentStore()
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const hasResponded = 'data_processing' in consents
    if (!hasResponded) {
      const timer = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [consents])

  if (!show) return null

  const handleAcceptAll = () => {
    grantAll()
    setShow(false)
  }

  const handleRejectAll = () => {
    revokeAll()
    setShow(false)
  }

  const handleCustom = (type: ConsentType, granted: boolean) => {
    if (granted) grant(type)
    else revoke(type)
  }

  const handleSaveCustom = () => {
    // Ensure data_processing has a response
    if (!('data_processing' in consents)) {
      revoke('data_processing')
    }
    setShow(false)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {lang === 'ar' ? 'موافقة الخصوصية وحماية البيانات' : 'Privacy & Data Protection Consent'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar'
                ? 'نحتاج موافقتك لمعالجة بياناتك الطبية. يمكنك تغيير تفضيلاتك في أي وقت من الإعدادات.'
                : 'We need your consent to process your medical data. You can change your preferences anytime in Settings.'}
            </p>
          </div>
          <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {expanded && (
          <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700">
            {(Object.keys(CONSENT_LABELS) as ConsentType[]).map((type) => (
              <label key={type} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {lang === 'ar' ? CONSENT_LABELS[type].ar : CONSENT_LABELS[type].en}
                </span>
                <input
                  type="checkbox"
                  defaultChecked={consents[type]?.granted ?? false}
                  onChange={(e) => handleCustom(type, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {lang === 'ar' ? 'تخصيص' : 'Customize'}
            </button>
          )}
          <button
            onClick={handleRejectAll}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {lang === 'ar' ? 'رفض الكل' : 'Reject all'}
          </button>
          {expanded ? (
            <button
              onClick={handleSaveCustom}
              className="px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              {lang === 'ar' ? 'حفظ التفضيلات' : 'Save preferences'}
            </button>
          ) : (
            <button
              onClick={handleAcceptAll}
              className="px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              {lang === 'ar' ? 'قبول الكل' : 'Accept all'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
