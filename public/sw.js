/**
 * BRILink Management System - Service Worker
 * Progressive Web App Caching & Offline Fallback Strategy
 * 
 * KEBIJAKAN KEAMANAN FINANSIAL:
 * - JANGAN PERNAH melakukan cache pada request POST, mutasi saldo, atau transaksi perbankan.
 * - Cache hanya dialokasikan untuk app shell, ikon, manifest, halaman offline, dan aset statis.
 * - Jika koneksi offline, tampilkan halaman /offline yang ramah pengguna.
 */

const CACHE_NAME = "brilink-pwa-v1.0.4";

// Asset statis inti yang di-precache saat instalasi service worker
const STATIC_PRECACHE_URLS = [
  "/offline",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Bersihkan cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Abaikan request non-GET (POST, PUT, DELETE Server Actions selalu NETWORK ONLY)
  if (request.method !== "GET") {
    return;
  }

  // 2. Abaikan chrome-extension, API internal Next.js hot reload, dan seluruh endpoint /api/
  if (!url.protocol.startsWith("http") || url.pathname.startsWith("/api/")) {
    return;
  }

  // 3. Strategi untuk Navigasi Halaman (HTML Pages):
  // NETWORK-FIRST dengan fallback ke /offline jika koneksi putus
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Jangan cache respons halaman finansial privat agar saldo selalu live
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedOffline = await cache.match("/offline");
          if (cachedOffline) {
            return cachedOffline;
          }
          return new Response(
            `<!DOCTYPE html>
            <html lang="id">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Offline - BRILink Management</title>
                <style>
                  body { font-family: sans-serif; background: #001D40; color: #fff; text-align: center; padding: 40px 20px; }
                  .card { max-width: 400px; margin: 40px auto; background: #002D62; padding: 30px; border-radius: 20px; }
                  h1 { font-size: 20px; margin-bottom: 10px; }
                  p { font-size: 14px; color: #93C5FD; }
                  button { margin-top: 20px; padding: 12px 24px; background: #10B981; border: none; border-radius: 10px; color: #fff; font-weight: bold; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>Koneksi Terputus (Offline)</h1>
                  <p>Aplikasi BRILink membutuhkan koneksi internet untuk memverifikasi saldo dan memproses transaksi secara aman.</p>
                  <button onclick="window.location.reload()">Coba Sambungkan Lagi</button>
                </div>
              </body>
            </html>`,
            {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        })
    );
    return;
  }

  // 4. Strategi untuk Aset Statis (Gambar, Icon, CSS, Fonts, JS Chunks):
  // STALE-WHILE-REVALIDATE atau CACHE-FIRST
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update di background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: Network fetch biasa
  event.respondWith(fetch(request));
});

// Push Notification Event
self.addEventListener("push", (event) => {
  let data = {
    title: "BRILink Management",
    body: "Pemberitahuan aktivitas operasional cabang.",
    url: "/owner",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/owner",
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/owner";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
