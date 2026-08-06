import { useState } from 'react'
import { KeyRound, ShieldCheck, QrCode, Copy } from 'lucide-react'
import { useI18n } from '../i18n'
import { useMFAStore } from '../store/mfaStore'
import { useAuthStore } from '../store/authStore'
import { generateSecret, generateOTPAuthURI, verifyTOTP, isMFARequired } from '../lib/mfa'
import {
  usesServerMfa,
  enrollServerTotp,
  verifyServerEnrollment,
  challengeAndVerifyServerMfa,
  getVerifiedTotpFactorId,
} from '../lib/supabaseMfa'
import { toast } from 'sonner'

interface MFASetupProps {
  userId: string
  email: string
  role: string
  onVerified: () => void
  onCancel: () => void
}

export function MFASetup({ userId, email, role, onVerified, onCancel }: MFASetupProps) {
  const { lang } = useI18n()
  const { enroll, setVerified } = useMFAStore()
  const markMfaVerified = useAuthStore((s) => s.markMfaVerified)
  const server = usesServerMfa()
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [secret, setSecret] = useState('')
  const [otpAuthURI, setOtpAuthURI] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  const handleGenerate = async () => {
    setEnrolling(true)
    try {
      if (server) {
        const result = await enrollServerTotp(`Hospital360:${email}`)
        setFactorId(result.factorId)
        setSecret(result.secret)
        setOtpAuthURI(result.uri)
        setQrCode(result.qrCode)
        setStep('verify')
      } else {
        const newSecret = generateSecret()
        setSecret(newSecret)
        setOtpAuthURI(generateOTPAuthURI(newSecret, email))
        setStep('verify')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (lang === 'ar' ? 'فشل الإنشاء' : 'Enroll failed'))
    } finally {
      setEnrolling(false)
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error(lang === 'ar' ? 'الرمز يجب أن يكون 6 أرقام' : 'Code must be 6 digits')
      return
    }
    setVerifying(true)
    try {
      if (server) {
        if (!factorId) throw new Error('Missing factor id')
        await verifyServerEnrollment(factorId, code)
        markMfaVerified(true)
        toast.success(lang === 'ar' ? 'تم تفعيل المصادقة الثنائية' : 'MFA enabled successfully')
        onVerified()
      } else {
        const valid = await verifyTOTP(secret, code)
        if (valid) {
          enroll(userId, secret)
          setVerified(userId)
          markMfaVerified(true)
          toast.success(lang === 'ar' ? 'تم تفعيل المصادقة الثنائية' : 'MFA enabled successfully')
          onVerified()
        } else {
          toast.error(lang === 'ar' ? 'رمز غير صحيح' : 'Invalid code')
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (lang === 'ar' ? 'فشل التحقق' : 'Verification failed'))
    } finally {
      setVerifying(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast.success(lang === 'ar' ? 'تم نسخ المفتاح' : 'Secret copied')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'المصادقة الثنائية (MFA)' : 'Multi-Factor Authentication (MFA)'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {server
                ? (lang === 'ar' ? 'مدعومة عبر Supabase Auth (AAL2)' : 'Supabase Auth (AAL2)')
                : isMFARequired(role)
                  ? (lang === 'ar' ? 'مطلوبة لدورك (وضع تجريبي)' : 'Required for your role (demo)')
                  : (lang === 'ar' ? 'اختيارية' : 'Optional')}
            </p>
          </div>
        </div>

        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lang === 'ar'
                ? 'لتفعيل المصادقة الثنائية، تحتاج إلى تطبيق مصادقة مثل Google Authenticator أو Authy.'
                : 'To enable MFA, you need an authenticator app like Google Authenticator or Authy.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void handleGenerate()}
                disabled={enrolling}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {enrolling
                  ? (lang === 'ar' ? 'جارٍ الإنشاء...' : 'Enrolling...')
                  : (lang === 'ar' ? 'إنشاء مفتاح' : 'Generate secret')}
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <QrCode className="w-4 h-4" />
                {lang === 'ar' ? 'امسح هذا المفتاح في تطبيق المصادقة' : 'Scan this secret in your authenticator app'}
              </label>
              {qrCode && (
                <div className="flex justify-center p-2 bg-white rounded-lg">
                  {/* Supabase returns an SVG data URL */}
                  <img src={qrCode} alt="MFA QR" className="w-40 h-40" />
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{secret}</code>
                <button onClick={copySecret} className="text-gray-400 hover:text-primary-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {otpAuthURI && (
                <p className="text-xs text-gray-400 break-all">
                  {lang === 'ar' ? 'أو أدخل يدوياً:' : 'Or enter manually:'}{' '}
                  <code className="font-mono">{otpAuthURI}</code>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                {lang === 'ar' ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter the 6-digit code'}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-primary-500 outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => void handleVerify()}
                disabled={verifying || code.length !== 6}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {verifying
                  ? (lang === 'ar' ? 'جارٍ التحقق...' : 'Verifying...')
                  : (lang === 'ar' ? 'تحقق' : 'Verify')}
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MFAVerifyProps {
  userId: string
  onVerified: () => void
  onCancel: () => void
}

export function MFAVerify({ userId, onVerified, onCancel }: MFAVerifyProps) {
  const { lang } = useI18n()
  const { getSecret, setVerified } = useMFAStore()
  const markMfaVerified = useAuthStore((s) => s.markMfaVerified)
  const server = usesServerMfa()
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleVerify = async () => {
    setVerifying(true)
    try {
      if (server) {
        const factorId = await getVerifiedTotpFactorId()
        if (!factorId) {
          toast.error(
            lang === 'ar'
              ? 'لا يوجد عامل MFA مسجّل — أكمل الإعداد أولاً'
              : 'No MFA factor enrolled — complete setup first',
          )
          onCancel()
          return
        }
        await challengeAndVerifyServerMfa(factorId, code)
        markMfaVerified(true)
        onVerified()
        return
      }

      const secret = getSecret(userId)
      if (!secret) {
        toast.error(
          lang === 'ar'
            ? 'لم يتم العثور على مفتاح MFA — أعد تسجيل الدخول وأكمل الإعداد'
            : 'MFA secret missing — sign in again and complete setup',
        )
        onCancel()
        return
      }
      const valid = await verifyTOTP(secret, code)
      if (valid) {
        setVerified(userId)
        markMfaVerified(true)
        onVerified()
      } else {
        toast.error(lang === 'ar' ? 'رمز غير صحيح' : 'Invalid code')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (lang === 'ar' ? 'فشل التحقق' : 'Verification failed'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {lang === 'ar' ? 'تحقق المصادقة الثنائية' : 'MFA Verification'}
          </h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {lang === 'ar'
            ? 'أدخل الرمز من تطبيق المصادقة الخاص بك.'
            : 'Enter the code from your authenticator app.'}
        </p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-primary-500 outline-none"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') void handleVerify() }}
        />

        <div className="flex gap-2">
          <button
            onClick={() => void handleVerify()}
            disabled={verifying || code.length !== 6}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {verifying
              ? (lang === 'ar' ? 'جارٍ التحقق...' : 'Verifying...')
              : (lang === 'ar' ? 'تحقق' : 'Verify')}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
