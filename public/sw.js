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
