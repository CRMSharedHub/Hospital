interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  url: string
  timestamp: string
  userAgent: string
}

function resolveErrorEndpoint(): string | undefined {
  const fromEnv = import.meta.env.VITE_ERROR_ENDPOINT as string | undefined
  if (fromEnv) return fromEnv
  // Dev default: Vite middleware / SSR server sink
  if (import.meta.env.DEV) return '/api/errors'
  return undefined
}

export async function reportError(report: ErrorReport): Promise<void> {
  if (import.meta.env.DEV) {
    console.error('[Error Report]', report)
  }

  const endpoint = resolveErrorEndpoint()
  if (!endpoint) return

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      credentials: 'include',
    })
  } catch {
    // Silent fail — don't crash the app trying to report an error
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
