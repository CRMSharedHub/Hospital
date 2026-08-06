interface VitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  entries: PerformanceEntry[]
}

type VitalCallback = (metric: VitalMetric) => void

const callbacks: VitalCallback[] = []

function rateLCP(value: number): VitalMetric['rating'] {
  if (value <= 2500) return 'good'
  if (value <= 4000) return 'needs-improvement'
  return 'poor'
}

function rateCLS(value: number): VitalMetric['rating'] {
  if (value <= 0.1) return 'good'
  if (value <= 0.25) return 'needs-improvement'
  return 'poor'
}

function rateINP(value: number): VitalMetric['rating'] {
  if (value <= 200) return 'good'
  if (value <= 500) return 'needs-improvement'
  return 'poor'
}

function rateTTFB(value: number): VitalMetric['rating'] {
  if (value <= 800) return 'good'
  if (value <= 1800) return 'needs-improvement'
  return 'poor'
}

function reportMetric(name: string, value: number, rating: VitalMetric['rating'], entries: PerformanceEntry[], delta?: number): void {
  const metric: VitalMetric = { name, value, rating, delta, entries }
  if (import.meta.env.DEV) {
    console.debug(`[Web Vitals] ${name}:`, value, rating)
  }
  for (const cb of callbacks) cb(metric)
}

/**
 * Observe LCP (Largest Contentful Paint).
 */
function observeLCP(): void {
  const entries: PerformanceEntry[] = []
  const observer = new PerformanceObserver((list) => {
    entries.push(...list.getEntries())
  })
  observer.observe({ type: 'largest-contentful-paint', buffered: true })

  // Report on visibility change or page unload
  const report = () => {
    const lastEntry = entries[entries.length - 1]
    if (lastEntry) {
      reportMetric('LCP', lastEntry.startTime, rateLCP(lastEntry.startTime), entries)
    }
    observer.disconnect()
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') report() }, { once: true })
}

/**
 * Observe CLS (Cumulative Layout Shift).
 */
function observeCLS(): void {
  let clsValue = 0
  const entries: PerformanceEntry[] = []
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      entries.push(entry)
      const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
      if (!layoutShift.hadRecentInput) {
        clsValue += layoutShift.value ?? 0
      }
    }
  })
  observer.observe({ type: 'layout-shift', buffered: true })

  const report = () => {
    reportMetric('CLS', clsValue, rateCLS(clsValue), entries)
    observer.disconnect()
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') report() }, { once: true })
}

/**
 * Observe INP (Interaction to Next Paint) — replaces FID.
 */
function observeINP(): void {
  const entries: PerformanceEntry[] = []
  let maxDuration = 0
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      entries.push(entry)
      const duration = entry.duration
      if (duration > maxDuration) maxDuration = duration
    }
  })
  observer.observe({ type: 'event', buffered: true })

  const report = () => {
    if (maxDuration > 0) {
      reportMetric('INP', maxDuration, rateINP(maxDuration), entries)
    }
    observer.disconnect()
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') report() }, { once: true })
}

/**
 * Measure TTFB (Time to First Byte) from Navigation API.
 */
function measureTTFB(): void {
  const navEntries = performance.getEntriesByType('navigation')
  if (navEntries.length > 0) {
    const nav = navEntries[0] as PerformanceNavigationTiming
    const ttfb = nav.responseStart
    if (ttfb > 0) {
      reportMetric('TTFB', ttfb, rateTTFB(ttfb), navEntries)
    }
  }
}

let initialized = false

/**
 * Initialize Web Vitals monitoring. Call once on app startup.
 */
export function initWebVitals(onMetric?: VitalCallback): void {
  if (onMetric) callbacks.push(onMetric)
  if (initialized) return
  initialized = true

  if (typeof PerformanceObserver === 'undefined') return

  measureTTFB()
  observeLCP()
  observeCLS()
  observeINP()
}

/**
 * Send vitals to an external endpoint if configured.
 */
export function reportVitalsToEndpoint(endpoint: string): void {
  initWebVitals((metric) => {
    const payload = {
      name: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    }
    try {
      navigator.sendBeacon(endpoint, JSON.stringify(payload))
    } catch {
      // Silent fail
    }
  })
}
