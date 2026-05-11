const STATIC_CACHE = "malabarbazaar-static-v2";
const RUNTIME_CACHE = "malabarbazaar-runtime-v2";
const OFFLINE_CACHE = "malabarbazaar-offline-v2";
const OFFLINE_CART_URL = "/__offline_cart__";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/logo192.png",
  "/logo512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, RUNTIME_CACHE, OFFLINE_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }

          return Promise.resolve(false);
        })
      )
    ).then(() => self.clients.claim())
  );
});

const putOfflineCartSnapshot = async (payload = {}) => {
  const cache = await caches.open(OFFLINE_CACHE);
  await cache.put(
    OFFLINE_CART_URL,
    new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  );
};

const getOfflineCartSnapshot = async () => {
  const cache = await caches.open(OFFLINE_CACHE);
  const response = await cache.match(OFFLINE_CART_URL);

  if (!response) {
    return {
      cart: [],
      updatedAt: null,
    };
  }

  try {
    return await response.json();
  } catch (error) {
    return {
      cart: [],
      updatedAt: null,
    };
  }
};

const cacheRuntimeResponse = async (request, response) => {
  if (!response || response.status !== 200 || request.method !== "GET") {
    return response;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, response.clone());
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isApiRequest =
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.includes("/auth/");

  // Never intercept non-GET or API requests. Let the browser handle them
  // directly so auth, payments, and other write operations do not get
  // entangled with service worker fetch passthrough behavior.
  if (request.method !== "GET" || isApiRequest) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => cacheRuntimeResponse(request, response))
        .catch(async () => {
          const cachedPage = await caches.match(request);
          return cachedPage || caches.match("/offline.html");
        })
    );
    return;
  }

  if (
    isSameOrigin &&
    ["script", "style", "image", "font"].includes(request.destination)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((response) => cacheRuntimeResponse(request, response))
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  if (!isSameOrigin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});

self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  if (type === "STORE_OFFLINE_CART") {
    event.waitUntil(putOfflineCartSnapshot(payload));
    return;
  }

  if (type === "CLEAR_OFFLINE_CART") {
    event.waitUntil(
      caches.open(OFFLINE_CACHE).then((cache) => cache.delete(OFFLINE_CART_URL))
    );
    return;
  }

  if (type === "GET_OFFLINE_CART") {
    event.waitUntil(
      getOfflineCartSnapshot().then((snapshot) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage(snapshot);
        }
      })
    );
    return;
  }

  if (type === "SHOW_NOTIFICATION") {
    const title = payload?.title || "Malabar Bazaar";
    const options = {
      body: payload?.options?.body || "",
      icon: payload?.options?.icon || "/logo192.png",
      badge: payload?.options?.badge || "/favicon.ico",
      tag: payload?.options?.tag || "",
      data: payload?.options?.data || {},
      renotify: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      body: event.data ? event.data.text() : "New notification",
    };
  }

  const title = payload.title || "Malabar Bazaar";
  const options = {
    body: payload.body || "New notification",
    icon: payload.icon || "/logo192.png",
    badge: payload.badge || "/favicon.ico",
    tag: payload.tag || "",
    data: payload.data || {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => client.url.includes(self.location.origin));

      if (matchingClient) {
        matchingClient.focus();
        matchingClient.navigate(targetUrl);
        return matchingClient;
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("sync", (event) => {
  if (!["sync-cart", "sync-offline-cart"].includes(event.tag)) {
    return;
  }

  event.waitUntil(
    getOfflineCartSnapshot().then((snapshot) =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "OFFLINE_CART_SYNCED",
            payload: snapshot,
          });
        });
      })
    )
  );
});

// ============ BACKGROUND LOCATION SHARING ============

// Background Sync for location sharing
self.addEventListener('sync', (event) => {
  if (event.tag === 'location-share-sync') {
    event.waitUntil(performLocationShareSync());
  }
});

// Periodic Background Sync for continuous location sharing
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'location-share-periodic') {
    event.waitUntil(performPeriodicLocationShare());
  }
});

// Enhanced push event for location sharing triggers
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    if (data.type === 'location-share-trigger') {
      event.waitUntil(handleLocationShareTrigger(data));
      return;
    }
  }

  // Handle regular push notifications
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      body: event.data ? event.data.text() : "New notification",
    };
  }

  const title = payload.title || "Malabar Bazaar";
  const options = {
    body: payload.body || "New notification",
    icon: payload.icon || "/logo192.png",
    badge: payload.badge || "/favicon.ico",
    tag: payload.tag || "",
    data: payload.data || {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Background location sharing functions
async function performLocationShareSync() {
  try {
    // Get active location sharing sessions from IndexedDB/cache
    const sessions = await getActiveLocationSessions();

    for (const session of sessions) {
      if (isSessionExpired(session)) {
        await endLocationSession(session);
        continue;
      }

      try {
        const position = await getBackgroundLocation();
        await sendLocationUpdate(session, position);
      } catch (locationError) {
        console.error('Background location error:', locationError);
        // Continue with other sessions even if one fails
      }
    }
  } catch (error) {
    console.error('Location share sync failed:', error);
  }
}

async function performPeriodicLocationShare() {
  try {
    const sessions = await getActiveLocationSessions();

    for (const session of sessions) {
      if (session.periodic && !isSessionExpired(session)) {
        try {
          const position = await getBackgroundLocation();
          await sendLocationUpdate(session, position);
        } catch (locationError) {
          console.error('Periodic location share error:', locationError);
        }
      }
    }
  } catch (error) {
    console.error('Periodic location share failed:', error);
  }
}

async function handleLocationShareTrigger(data) {
  try {
    const session = await getLocationSession(data.sessionId);
    if (session && !isSessionExpired(session)) {
      const position = await getBackgroundLocation();
      await sendLocationUpdate(session, position);
    }
  } catch (error) {
    console.error('Location share trigger failed:', error);
  }
}

// Helper functions for background location operations
async function getBackgroundLocation() {
  // This would be called from a background script
  // For now, we'll use a placeholder that would be replaced with actual geolocation
  return new Promise((resolve, reject) => {
    // In a real implementation, this would use the Background Geolocation API
    // or wake up the main thread to get location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        }
      );
    } else {
      reject(new Error('Geolocation not supported'));
    }
  });
}

async function getActiveLocationSessions() {
  // Get sessions from IndexedDB or cache
  const cache = await caches.open('location-sessions');
  const response = await cache.match('/active-sessions');

  if (response) {
    return await response.json();
  }

  return [];
}

async function getLocationSession(sessionId) {
  const cache = await caches.open('location-sessions');
  const response = await cache.match(`/session/${sessionId}`);

  if (response) {
    return await response.json();
  }

  return null;
}

function isSessionExpired(session) {
  const now = Date.now();
  const endTime = new Date(session.endTime).getTime();
  return now >= endTime;
}

async function sendLocationUpdate(session, position) {
  const { latitude, longitude } = position.coords;
  const locationData = {
    sessionId: session.id,
    latitude,
    longitude,
    timestamp: Date.now(),
    accuracy: position.coords.accuracy
  };

  // Send to backend API
  try {
    const response = await fetch('/api/location/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`
      },
      body: JSON.stringify(locationData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Update last update time
    session.lastUpdate = Date.now();
    await saveLocationSession(session);

  } catch (error) {
    console.error('Failed to send location update:', error);
    // Could retry later or queue for sync
    throw error;
  }
}

async function saveLocationSession(session) {
  const cache = await caches.open('location-sessions');
  await cache.put(
    `/session/${session.id}`,
    new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

async function endLocationSession(session) {
  try {
    // Notify backend that session ended
    await fetch('/api/location/end-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`
      },
      body: JSON.stringify({ sessionId: session.id })
    });
  } catch (error) {
    console.error('Failed to end location session:', error);
  }

  // Remove from cache
  const cache = await caches.open('location-sessions');
  await cache.delete(`/session/${session.id}`);
}
