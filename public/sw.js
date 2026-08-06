const CACHE_NAME = 'hospital-v3'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json']

// ── Install: pre-cache static assets only (never PHI) ─────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
  )
})

// ── Activate: clean old caches (including any PHI-cached v2) ─
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

// ── Fetch strategy ─────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never cache Supabase / API / auth / storage — PHI must not enter Cache API
  if (
    url.hostname.endsWith('.supabase.co') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/storage/')
  ) {
    return
  }

  // Skip other cross-origin requests
  if (url.origin !== self.location.origin) return

  // Network-first for navigation; do not cache HTML responses that may embed session UI
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || Response.error())),
    )
    return
  }

  // Cache-first for static assets only (JS, CSS, images, fonts)
  const isStaticAsset =
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map)$/i.test(url.pathname) ||
    url.pathname.startsWith('/assets/')

  if (!isStaticAsset) {
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})

// ── Background Sync: notify clients to retry mutations ─────
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-mutations') {
    event.waitUntil(
      self.clients.matchAll().then((clients) =>
        clients.forEach((client) => client.postMessage({ type: 'background-sync' })),
      ),
    )
  }
})

// ── Message handler ────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Push notification handler ──────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Hospital360', body: 'New notification' }
  try {
    if (event.data) data = event.data.json()
  } catch {
    if (event.data) data = { title: 'Hospital360', body: event.data.text() }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: data.actions || [],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// ── Notification click handler ─────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url) && 'focus' in c)
      if (existing) return existing.focus()
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
