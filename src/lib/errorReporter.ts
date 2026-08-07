interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  url: string
  timestamp: string
  userAgent: string
}

const ERROR_ENDPOINT = import.meta.env.VITE_ERROR_ENDPOINT as string | undefined

export async function reportError(report: ErrorReport): Promise<void> {
  // Always log to console in development
  if (import.meta.env.DEV) {
    console.error('[Error Report]', report)
  }

  // Send to external endpoint if configured (e.g. Sentry, custom API)
  if (ERROR_ENDPOINT) {
    try {
      await fetch(ERROR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        credentials: 'include',
      })
    } catch {
      // Silent fail — don't crash the app trying to report an error
    }
  }
}

export function reportUnhandledError(error: Error, info?: { componentStack?: string }): void {
  void reportError({
    message: error.message,
    stack: error.stack,
    componentStack: info?.componentStack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  })
}
