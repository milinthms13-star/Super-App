// PWA Service Worker
const CACHE_NAME = 'malabarbazaar-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/favicon.ico',
  // Cache API responses for offline
  '/api/health'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Cache-first for static assets
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => caches.match('/offline.html'))
    );
  } else {
    // Network-first for API
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline.html'))
    );
  }
});

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/logo192.png',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: { date: new Date().toISOString() }
  };
  
  event.waitUntil(
    self.registration.showNotification('Malabar Bazaar', options)
  );
});

// Background sync for cart/orders
self.addEventListener('sync', event => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  // Sync offline cart to server
  const offlineCart = await getOfflineCart();
  if (offlineCart.length > 0) {
    await fetch('/api/cart/sync', {
      method: 'POST',
      body: JSON.stringify(offlineCart)
    });
    await clearOfflineCart();
  }
}

function getOfflineCart() {
  return caches.open('cart-offline').then(cache => 
    cache.match('/cart.json').then(res => res ? res.json() : [])
  );
}

function clearOfflineCart() {
  return caches.open('cart-offline').then(cache => 
    cache.delete('/cart.json')
  );
}

