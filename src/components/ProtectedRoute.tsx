import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useMFAStore } from '../store/mfaStore'
import { getRoutePermission, hasPermission } from '../auth/permissions'
import { isMFARequired } from '../lib/mfa'
import { isProductionMisconfigured } from '../lib/runtimeConfig'
import { assertServerSession, requiresServerSession } from '../lib/sessionSync'
import { usesServerMfa } from '../lib/supabaseMfa'
import type { Permission } from '../auth/permissions'

interface ProtectedRouteProps {
  permissions?: Permission[]
}

function SessionSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Checking session">
      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
}

export default function ProtectedRoute({ permissions }: ProtectedRouteProps = {}) {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const sessionReady = useAuthStore((state) => state.sessionReady)
  const sessionBound = useAuthStore((state) => state.sessionBound)
  const mfaVerified = useAuthStore((state) => state.mfaVerified)
  const isVerifiedLocal = useMFAStore((state) => (user ? state.isVerified(user.id) : false))
  const location = useLocation()
  const serverMfa = usesServerMfa()

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!requiresServerSession()) {
        const auth = useAuthStore.getState()
        if (!auth.sessionReady) {
          auth.markSessionBound(auth.isAuthenticated)
          auth.markSessionReady(true)
        }
        return
      }
      if (cancelled) return
      await assertServerSession()
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (isProductionMisconfigured()) {
    return <Navigate to="/login" replace />
  }

  if (!sessionReady) {
    return <SessionSpinner />
  }

  if (requiresServerSession() && !sessionBound) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (isMFARequired(user.role)) {
    const ok = serverMfa ? mfaVerified : isVerifiedLocal
    if (!ok) {
      return <Navigate to="/login" replace state={{ from: location, mfaRequired: true }} />
    }
  }

  const routePerm = getRoutePermission(location.pathname)
  if (routePerm && !hasPermission(user, routePerm)) {
    return <Navigate to="/" replace />
  }

  if (permissions && !permissions.every((p) => hasPermission(user, p))) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
