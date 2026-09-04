import { precacheAndRoute } from 'workbox-precaching';

// Precaches only the build's own static assets (JS/CSS/HTML from the manifest vite-plugin-pwa
// injects at build time). Deliberately no runtime-caching routes are registered here — every
// Supabase API call still goes straight to the network, uncached, so this service worker can
// never serve stale employee data.
precacheAndRoute(self.__WB_MANIFEST);

// Without these, a new service worker (and its refreshed precache of index.html/assets) sits in
// "waiting" until every tab/window is fully closed — which may never happen for an installed
// home-screen PWA that's just backgrounded, not closed. That would pin users to a stale app
// shell indefinitely across deploys. Activate every new version immediately instead.
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Gritsa Portal';
  const options = {
    body: payload.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.endsWith(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
