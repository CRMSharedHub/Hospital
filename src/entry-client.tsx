import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import { seedDatabase } from './lib/seed'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { isProductionMisconfigured } from './lib/runtimeConfig'
import {
  configureSessionSyncHooks,
  syncAuthWithServerSession,
} from './lib/sessionSync'
import { useAuthStore } from './store/authStore'
import { reportUnhandledError } from './lib/errorReporter'
import { initWebVitals, reportVitalsToEndpoint } from './lib/webVitals'
import { startOfflineQueueLifecycle } from './lib/offlineQueueLifecycle'
import './index.css'

// ── Global error handlers ──────────────────────────────────
window.addEventListener('error', (e) => {
  reportUnhandledError(e.error ?? new Error(e.message))
})

window.addEventListener('unhandledrejection', (e) => {
  const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason))
  reportUnhandledError(err)
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

// ── Proactive token refresh ────────────────────────────────
let refreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleTokenRefresh(expiresAt: number | undefined): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  if (!expiresAt || !supabase) return

  const expiresAtMs = expiresAt * 1000
  const now = Date.now()
  const refreshIn = Math.max(expiresAtMs - now - 120_000, 10_000)

  refreshTimer = setTimeout(async () => {
    const sb = supabase
    if (!sb) return
    try {
      const { data, error } = await sb.auth.refreshSession()
      if (error || !data.session) {
        useAuthStore.getState().clearLocalAuth()
        useAuthStore.getState().markSessionReady(true)
        queryClient.clear()
      } else {
        useAuthStore.getState().markSessionBound(true)
        scheduleTokenRefresh(data.session.expires_at)
      }
    } catch {
      // Network error — retry on next user action
    }
  }, refreshIn)
}

configureSessionSyncHooks({
  onTokenRefresh: scheduleTokenRefresh,
  onSignedOut: () => {
    queryClient.clear()
  },
})

// ── Initialize Web Vitals monitoring ───────────────────────
// Prefer explicit env; in DEV default to local Vite/SSR sink.
const vitalsEndpoint =
  (import.meta.env.VITE_VITALS_ENDPOINT as string | undefined) ||
  (import.meta.env.DEV ? '/api/vitals' : undefined)
if (vitalsEndpoint) {
  reportVitalsToEndpoint(vitalsEndpoint)
} else {
  initWebVitals()
}

// ── Hydrate after session is bound (or demo bootstrap) ─────
Promise.all([seedDatabase(), syncAuthWithServerSession()]).then(() => {
  if (isProductionMisconfigured()) {
    useAuthStore.getState().clearLocalAuth()
    useAuthStore.getState().markSessionReady(true)
  }

  // Demo without Supabase: ensure gate is open after seed
  if (!isSupabaseConfigured && !useAuthStore.getState().sessionReady) {
    const auth = useAuthStore.getState()
    auth.markSessionBound(auth.isAuthenticated)
    auth.markSessionReady(true)
  }

  ReactDOM.hydrateRoot(
    document.getElementById('root') as HTMLElement,
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster richColors position="top-center" />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  )
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app still works online
    })
  })
}

startOfflineQueueLifecycle(queryClient)
