// Service Worker for Offline Support and Caching
// IMPORTANT:
// - Never serve a stale HTML shell (/) after deployments, or users will see a broken app until hard refresh.
// - Use network-first for navigations/HTML and keep caches versioned so old caches are purged on activate.
const CACHE_NAME = 'nomadic-notions-v2'
const STATIC_CACHE_NAME = 'nomadic-notions-static-v2'
const DYNAMIC_CACHE_NAME = 'nomadic-notions-dynamic-v2'

// Assets to cache immediately on install
// Do NOT precache '/' or other HTML routes — that can cause stale HTML to reference removed JS bundles.
const STATIC_ASSETS = ['/favicon.ico', '/manifest.json', '/Nomadic Notion-logo-2.png']

// Cache strategies
const CACHE_STRATEGY = {
  CACHE_FIRST: 'cache-first', // For static assets
  NETWORK_FIRST: 'network-first', // For API calls and dynamic content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate', // For images and media
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] Cache install failed:', error)
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME
              )
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }),
        )
      })
      .then(() => self.clients.claim())
      .catch((error) => {
        console.error('[Service Worker] Cache cleanup failed:', error)
      }),
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Skip API calls that need real-time data (analytics, likes, comments)
  if (url.pathname.startsWith('/api/analytics/') || url.pathname.startsWith('/api/blog/like')) {
    return fetch(request)
  }

  // Navigations (HTML documents): always prefer network to avoid stale HTML after deployments.
  // This is the #1 fix for "works only after Ctrl+F5".
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstHTMLStrategy(request, DYNAMIC_CACHE_NAME))
    return
  }

  // Strategy: Network First for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME))
    return
  }

  // Strategy: Cache First for static assets and images
  // Check if hostname is imagekit.io or a subdomain of it (e.g., ik.imagekit.io)
  const isImageKitHost = url.hostname === 'imagekit.io' || url.hostname.endsWith('.imagekit.io')
  if (
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/blogs-img/') ||
    isImageKitHost
  ) {
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE_NAME))
    return
  }

  // Pages (non-navigate fetches): prefer network-first as well.
  // (If your router prefetches JSON or other content, it will still be cached safely.)
  if (url.pathname.startsWith('/blogs/') || url.pathname === '/') {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME))
    return
  }

  // Default: Network First for other requests
  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME))
})

// Network First strategy specifically for HTML navigations.
// Uses a cache-busted request to avoid the browser HTTP cache returning stale HTML.
async function networkFirstHTMLStrategy(request, cacheName) {
  try {
    const cacheBustedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      credentials: request.credentials,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      integrity: request.integrity,
      cache: 'no-store',
    })

    const networkResponse = await fetch(cacheBustedRequest)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      try {
        await cache.put(request, networkResponse.clone())
      } catch (error) {
        console.warn('[Service Worker] Failed to update HTML cache:', error)
      }
    }
    return networkResponse
  } catch (error) {
    console.log('[Service Worker] HTML network failed, trying cache:', error)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) return cachedResponse
    // As a final fallback, try the root cached document (if any)
    const cachedRoot = await caches.match('/')
    if (cachedRoot) return cachedRoot
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// Cache First Strategy - check cache first, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('[Service Worker] Cache first failed:', error)
    // Return offline fallback if available
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// Network First Strategy - try network first, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', error)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// Stale While Revalidate Strategy - return cache immediately, update in background
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await caches.match(request)

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch((error) => {
      console.log('[Service Worker] Background update failed:', error)
    })

  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || (await fetchPromise)
}

// Background sync for offline actions (comments, likes)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-comments' || event.tag === 'sync-likes') {
    event.waitUntil(syncOfflineActions(event.tag))
  }
})

async function syncOfflineActions(tag) {
  try {
    // This would sync any queued actions when back online
    // Implementation depends on your specific needs
    console.log('[Service Worker] Syncing offline actions:', tag)
    // You would read from IndexedDB and sync with server here
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error)
  }
}

// Handle push notifications (if implemented)
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || 'New update available',
    icon: '/Nomadic Notion-logo-2.png',
    badge: '/Nomadic Notion-logo-2.png',
    tag: data.tag || 'default',
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Nomadic Notions', options))
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data?.url || '/'
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})
