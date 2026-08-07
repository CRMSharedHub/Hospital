import { useState, useEffect } from 'react'
import { Bell, Moon, Sun, Globe, User, LogOut, Shield, Trash2, FileText, Check, BellRing } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useConsentStore, type ConsentType } from '../store/consentStore'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '../auth/usePermission'
import RoleBadge from '../components/RoleBadge'
import { RETENTION_POLICIES } from '../lib/dataRetention'
import { dal } from '../lib/dal'
import { toast } from 'sonner'
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush, requestNotificationPermission } from '../lib/pushNotifications'

export default function Settings() {
  const { t, lang, toggleLang } = useI18n()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(true)
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const darkMode = theme === 'dark'
  const { permissions } = usePermission()
  const { grant, revoke, hasConsent } = useConsentStore()
  const [erasing, setErasing] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported] = useState(isPushSupported())

  useEffect(() => {
    if (pushSupported) {
      isPushSubscribed().then(setPushEnabled)
    }
  }, [pushSupported])

  const handleTogglePush = async () => {
    if (pushEnabled) {
      await unsubscribeFromPush()
      setPushEnabled(false)
      toast.success(lang === 'ar' ? 'تم إيقاف الإشعارات' : 'Push notifications disabled')
    } else {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        toast.error(lang === 'ar' ? 'تم رفض إذن الإشعارات' : 'Notification permission denied')
        return
      }
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (vapidKey) {
        const sub = await subscribeToPush(vapidKey)
        if (sub) {
          // Send subscription to server (endpoint would be configured)
          toast.success(lang === 'ar' ? 'تم تفعيل الإشعارات' : 'Push notifications enabled')
        }
      } else {
        toast.success(lang === 'ar' ? 'تم تفعيل الإشعارات المحلية' : 'Local notifications enabled')
      }
      setPushEnabled(true)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('settings')}</h2>

      <div className="card space-y-6">
        {/* Language */}
        <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            <Globe className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('language')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('languageDescription')}
            </p>
            <button
              onClick={toggleLang}
              className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {t('switchLanguage')}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('notifications')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('notificationsDescription')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotifications((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'
                } ${lang === 'ar' && !notifications ? '-translate-x-1' : ''}`}
            />
          </button>
        </div>

        {/* Push Notifications */}
        {pushSupported && (
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {lang === 'ar' ? 'إشعارات الدفع' : 'Push Notifications'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {lang === 'ar'
                    ? 'تلقي إشعارات فورية على جهازك حتى عند إغلاق التطبيق.'
                    : 'Receive instant notifications on your device even when the app is closed.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePush}
              className={`relative w-12 h-6 rounded-full transition-colors ${pushEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${pushEnabled ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'} ${lang === 'ar' && !pushEnabled ? '-translate-x-1' : ''}`}
              />
            </button>
          </div>
        )}

        {/* Dark Mode */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              {darkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('darkMode')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('darkModeDescription')}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'
                } ${lang === 'ar' && !darkMode ? '-translate-x-1' : ''}`}
            />
          </button>
        </div>

        {/* Profile */}
        <div className="flex items-start gap-4 pt-2 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('profile')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {user?.name} · {user?.email}
            </p>
            {user && (
              <div className="mt-2">
                <RoleBadge role={user.role} size="md" />
              </div>
            )}
            <button onClick={handleLogout} className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </div>
        </div>

        {/* Permissions */}
        <div className="flex items-start gap-4 pt-2 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('permissions')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
              {permissions.length} {t('permissions')}
            </p>
            <div className="flex flex-wrap gap-2">
              {permissions.map((perm) => (
                <span key={perm} className="px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy & Consent Management (GDPR) */}
        <div className="flex items-start gap-4 pt-2 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Check className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'إدارة الموافقات (GDPR)' : 'Consent Management (GDPR)'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
              {lang === 'ar'
                ? 'تحكم في كيفية استخدام بياناتك. يمكنك سحب موافقتك في أي وقت.'
                : 'Control how your data is used. You can withdraw consent at any time.'}
            </p>
            <div className="space-y-2">
              {([
                { type: 'data_processing', ar: 'معالجة البيانات الطبية', en: 'Medical data processing' },
                { type: 'marketing', ar: 'رسائل ترويجية', en: 'Marketing communications' },
                { type: 'analytics', ar: 'تحليلات الأداء', en: 'Performance analytics' },
                { type: 'third_party_share', ar: 'مشاركة مع أطراف ثالثة', en: 'Third-party data sharing' },
              ] as { type: ConsentType; ar: string; en: string }[]).map((item) => (
                <label key={item.type} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {lang === 'ar' ? item.ar : item.en}
                  </span>
                  <button
                    onClick={() => hasConsent(item.type) ? revoke(item.type) : grant(item.type)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${hasConsent(item.type) ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${hasConsent(item.type) ? (lang === 'ar' ? '-translate-x-5' : 'translate-x-5') : (lang === 'ar' ? '-translate-x-0.5' : 'translate-x-0.5')}`} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Data Retention Policy (HIPAA) */}
        <div className="flex items-start gap-4 pt-2 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'سياسة الاحتفاظ بالبيانات (HIPAA)' : 'Data Retention Policy (HIPAA)'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
              {lang === 'ar'
                ? 'المدة التي يتم الاحتفاظ بالبيانات فيها قبل الحذف التلقائي.'
                : 'How long data is retained before automatic purging.'}
            </p>
            <div className="space-y-1.5">
              {RETENTION_POLICIES.map((policy) => (
                <div key={policy.table} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-600 dark:text-gray-400">{policy.table}</span>
                  <span className="text-gray-500 dark:text-gray-500">
                    {policy.retentionDays >= 365
                      ? `${Math.floor(policy.retentionDays / 365)} ${lang === 'ar' ? 'سنوات' : 'years'}`
                      : `${policy.retentionDays} ${lang === 'ar' ? 'يوم' : 'days'}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right to Erasure (GDPR) */}
        <div className="flex items-start gap-4 pt-2">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'الحق في المحو (GDPR)' : 'Right to Erasure (GDPR)'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
              {lang === 'ar'
                ? 'احذف جميع بيانات المريض بشكل دائم. لا يمكن التراجع عن هذا الإجراء.'
                : 'Permanently delete all patient data. This action cannot be undone.'}
            </p>
            <button
              onClick={async () => {
                if (!user) return
                const confirmed = window.confirm(
                  lang === 'ar'
                    ? 'هل أنت متأكد؟ سيتم حذف جميع البيانات المرتبطة بهذا المستخدم نهائياً.'
                    : 'Are you sure? All data linked to this user will be permanently deleted.',
                )
                if (!confirmed) return
                setErasing(true)
                try {
                  let patientId = user.linkedPatientId
                  if (patientId == null && user.role === 'patient') {
                    toast.error(
                      lang === 'ar'
                        ? 'لا يوجد مريض مرتبط بهذا الحساب'
                        : 'No patient record linked to this account',
                    )
                    return
                  }
                  if (patientId == null && user.role === 'admin') {
                    const raw = window.prompt(
                      lang === 'ar' ? 'أدخل رقم المريض للحذف:' : 'Enter patient ID to erase:',
                    )
                    patientId = raw ? parseInt(raw, 10) : NaN
                  }
                  if (patientId == null || Number.isNaN(patientId)) {
                    toast.error(lang === 'ar' ? 'معرف المريض غير صالح' : 'Invalid patient ID')
                    return
                  }
                  const result = await dal.rightToErasure(patientId)
                  if (result.errors.length > 0) {
                    toast.error(`${lang === 'ar' ? 'أخطاء' : 'Errors'}: ${result.errors.join(', ')}`)
                  } else {
                    toast.success(lang === 'ar' ? 'تم حذف البيانات بنجاح' : 'Data deleted successfully')
                  }
                } catch {
                  toast.error(lang === 'ar' ? 'فشل حذف البيانات' : 'Failed to delete data')
                } finally {
                  setErasing(false)
                }
              }}
              disabled={erasing || user?.role !== 'patient' && user?.role !== 'admin'}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {erasing
                ? (lang === 'ar' ? 'جارٍ الحذف...' : 'Deleting...')
                : (lang === 'ar' ? 'حذف بياناتي' : 'Delete my data')}
            </button>
            {user?.role !== 'patient' && user?.role !== 'admin' && (
              <p className="text-xs text-gray-400 mt-2">
                {lang === 'ar' ? 'متاح للمرضى والمسؤولين فقط' : 'Available for patients and admins only'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
