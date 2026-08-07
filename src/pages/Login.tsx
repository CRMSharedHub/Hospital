import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Mail, Lock, Shield, Stethoscope, HeartPulse, User } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useI18n } from '../i18n'
import { authenticate, loadDemoUsers } from '../auth/authenticate'
import type { DemoUser } from '../auth/demoUsers'
import { loginSchema } from '../lib/validation'
import { useMFAStore } from '../store/mfaStore'
import { isMFARequired } from '../lib/mfa'
import { MFAVerify, MFASetup } from '../components/MFAVerify'
import { isDemoAuthAllowed, isProductionMisconfigured } from '../lib/runtimeConfig'
import { getServerMfaStatus, usesServerMfa } from '../lib/supabaseMfa'
import { startSsoLogin, completeSsoCallback, isRealSsoAvailable, startSupabaseOAuth } from '../lib/sso'
import type { LucideIcon } from 'lucide-react'
import type { User as UserType } from '../types'

const roleIcons: Record<string, LucideIcon> = {
  admin: Shield,
  doctor: Stethoscope,
  nurse: HeartPulse,
  patient: User,
}

function toAuthUser(user: UserType): UserType {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    linkedPatientId: user.linkedPatientId,
  }
}

export default function Login() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user: storedUser, isAuthenticated, mfaVerified } = useAuthStore()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [pendingUser, setPendingUser] = useState<UserType | null>(null)
  const [showMFASetup, setShowMFASetup] = useState(false)
  const [serverEnrolled, setServerEnrolled] = useState<boolean | null>(null)
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([])
  const isVerifiedLocal = useMFAStore((s) => (storedUser ? s.isVerified(storedUser.id) : false))
  const isEnrolledStored = useMFAStore((s) => (storedUser ? s.isEnrolled(storedUser.id) : false))
  const mfaStore = useMFAStore()
  const demoAllowed = isDemoAuthAllowed()
  const misconfigured = isProductionMisconfigured()
  const serverMfa = usesServerMfa()

  useEffect(() => {
    if (!demoAllowed || misconfigured) {
      return
    }
    let cancelled = false
    void loadDemoUsers().then((users) => {
      if (!cancelled) setDemoUsers(users)
    })
    return () => {
      cancelled = true
    }
  }, [demoAllowed, misconfigured])

  // SSO stub callback: /login?sso=1&email=admin@cityhospital.com
  useEffect(() => {
    if (misconfigured || !demoAllowed) return
    const params = new URLSearchParams(location.search)
    const result = completeSsoCallback(params)
    if (!result.ok || !result.email) return

    let cancelled = false
    void (async () => {
      const users = demoUsers.length ? demoUsers : await loadDemoUsers()
      const match = users.find((u) => u.email === result.email)
      if (!match || cancelled) {
        if (!cancelled) setError(result.message)
        return
      }
      setLoading(true)
      try {
        await continueAfterAuth(toAuthUser(match))
        navigate(from, { replace: true })
      } catch {
        if (!cancelled) setError(t('invalidCredentials'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot SSO stub
  }, [location.search, demoAllowed, misconfigured])

  const handleSsoStub = () => {
    if (isRealSsoAvailable()) {
      void startSupabaseOAuth().then((r) => {
        if (r.error) setError(r.error)
      })
      return
    }
    const started = startSsoLogin('oidc')
    const back = new URLSearchParams({
      sso: '1',
      stub: '1',
      email: email.trim() || 'admin@cityhospital.com',
      state: started.state,
    })
    navigate(`/login?${back.toString()}`, { replace: true })
  }

  const mfaOkForStored =
    !storedUser ||
    !isMFARequired(storedUser.role) ||
    (serverMfa ? mfaVerified : isVerifiedLocal)

  const fullyAuthenticated =
    isAuthenticated && !!storedUser && mfaOkForStored && !pendingUser

  const mfaUser =
    pendingUser ??
    (isAuthenticated && storedUser && isMFARequired(storedUser.role) && !mfaOkForStored
      ? storedUser
      : null)

  useEffect(() => {
    if (!serverMfa || !mfaUser) {
      return
    }
    let cancelled = false
    void getServerMfaStatus()
      .then((s) => {
        if (cancelled) return
        setServerEnrolled(s.enrolled)
        if (!s.enrolled) setShowMFASetup(true)
      })
      .catch(() => {
        if (!cancelled) setServerEnrolled(false)
      })
    return () => {
      cancelled = true
    }
  }, [serverMfa, mfaUser])

  if (fullyAuthenticated) {
    return <Navigate to={from} replace />
  }

  const mfaNeedsSetup =
    showMFASetup ||
    (mfaUser != null &&
      isMFARequired(mfaUser.role) &&
      (serverMfa ? serverEnrolled === false : !(pendingUser ? mfaStore.isEnrolled(pendingUser.id) : isEnrolledStored)))

  const completeLogin = (user: UserType, mfaDone = true) => {
    login(toAuthUser(user), { sessionBound: true, mfaVerified: mfaDone })
    navigate(from, { replace: true })
  }

  const continueAfterAuth = async (user: UserType) => {
    if (!isMFARequired(user.role)) {
      completeLogin(user, true)
      return
    }

    if (serverMfa) {
      try {
        const status = await getServerMfaStatus()
        if (!status.enrolled) {
          setPendingUser(user)
          setShowMFASetup(true)
          setServerEnrolled(false)
          login(toAuthUser(user), { sessionBound: true, mfaVerified: false })
          return
        }
        if (!status.verified) {
          setPendingUser(user)
          setShowMFASetup(false)
          setServerEnrolled(true)
          login(toAuthUser(user), { sessionBound: true, mfaVerified: false })
          return
        }
        completeLogin(user, true)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('invalidCredentials'))
      }
      return
    }

    // Demo client MFA
    if (!mfaStore.isEnrolled(user.id)) {
      setPendingUser(user)
      setShowMFASetup(true)
      return
    }
    if (!mfaStore.isVerified(user.id)) {
      setPendingUser(user)
      setShowMFASetup(false)
      return
    }
    completeLogin(user, true)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (misconfigured) {
      setError(
        lang === 'ar'
          ? 'إعدادات الإنتاج غير مكتملة — يلزم تهيئة Supabase'
          : 'Production misconfigured — Supabase credentials are required',
      )
      return
    }
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const errs: { email?: string; password?: string } = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'email') errs.email = issue.message
        if (issue.path[0] === 'password') errs.password = issue.message
      }
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setLoading(true)
    setError('')
    try {
      const user = await authenticate(email, password)
      if (user) {
        await continueAfterAuth(user)
      } else {
        setError(t('invalidCredentials'))
      }
    } catch {
      setError(t('invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setLoading(true)
    setError('')
    try {
      const user = await authenticate(demoEmail, demoPassword)
      if (user) {
        await continueAfterAuth(user)
      }
    } catch {
      setError(t('invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-primary-600 rounded-2xl shadow-lg">
            <Activity className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {t('appName')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('signInSubtitle')}
        </p>
        {misconfigured && (
          <p className="mt-4 mx-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-xs text-center">
            {lang === 'ar'
              ? 'هذا البناء للإنتاج بدون Supabase. عيّن VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.'
              : 'This production build has no Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}
          </p>
        )}
        {demoAllowed && !misconfigured && (
          <p className="mt-4 mx-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs text-center">
            {t('demoAuthWarning')}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('emailAddress')}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={misconfigured}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white ${fieldErrors.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('password')}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={misconfigured}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white ${fieldErrors.password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {fieldErrors.password && <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || misconfigured}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : t('signIn')}
            </button>
          </form>

          {(demoAllowed || isRealSsoAvailable()) && !misconfigured && (
            <button
              type="button"
              onClick={handleSsoStub}
              disabled={loading}
              className="mt-3 w-full flex justify-center py-2.5 px-4 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {isRealSsoAvailable() ? t('continueWithSsoLive') : t('continueWithSso')}
            </button>
          )}

          {demoAllowed && !misconfigured && demoUsers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-3">{t('quickLogin')}</p>
              <div className="grid grid-cols-2 gap-2">
                {demoUsers.map((u) => {
                  const Icon = roleIcons[u.role]
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleQuickLogin(u.email, u.password)}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs disabled:opacity-50"
                    >
                      <Icon className="w-4 h-4 text-primary-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="font-medium text-gray-700 dark:text-gray-300 truncate">{t(`role_${u.role}`)}</p>
                        <p className="text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {mfaNeedsSetup && mfaUser && (
        <MFASetup
          userId={mfaUser.id}
          email={mfaUser.email}
          role={mfaUser.role}
          onVerified={() => {
            completeLogin(mfaUser, true)
            setShowMFASetup(false)
            setPendingUser(null)
          }}
          onCancel={() => {
            setShowMFASetup(false)
            setPendingUser(null)
            setLoading(false)
            void useAuthStore.getState().logout()
          }}
        />
      )}

      {!mfaNeedsSetup && mfaUser && (
        <MFAVerify
          userId={mfaUser.id}
          onVerified={() => {
            completeLogin(mfaUser, true)
            setPendingUser(null)
          }}
          onCancel={() => {
            setPendingUser(null)
            setLoading(false)
            void useAuthStore.getState().logout()
          }}
        />
      )}
    </div>
  )
}
