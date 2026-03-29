// sw.js — Osaka Trip PWA Service Worker
// 每次改版只需要更新這個版本號，瀏覽器就會自動偵測新版
const CACHE_NAME = 'osaka-trip-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './illustration.png',
];

// ── Install：快取所有靜態資源 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// ── Activate：清除舊版快取 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch：Cache First，外部 API 走網路 ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 天氣 API、Notion Worker、Google Fonts — 永遠走網路
  if (
    url.hostname === 'api.open-meteo.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname.includes('workers.dev')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 其他：Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── Message：接收 index.html 的 SKIP_WAITING 指令 ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
