// HDIL-IPCA service worker — intentionally minimal.
//
// This does NOT implement offline caching or any cache-first/stale-while-
// revalidate strategy. The goal here is only to (a) satisfy the installability
// requirement for the PWA manifest and (b) receive push notifications. Adding
// aggressive caching risks ever serving stale content on the real site, so
// fetch is a trivial passthrough and nothing is cached.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Trivial passthrough — just fetch the request as normal and let any
  // errors (offline, network failure, etc.) propagate naturally instead of
  // masking them behind a cache.
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    return;
  }

  const { title, body, link } = payload || {};
  if (!title) return;

  const options = {
    body,
    data: { link },
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification.data && event.notification.data.link;
  const targetUrl = link || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === new URL(targetUrl, self.location.origin).pathname && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
