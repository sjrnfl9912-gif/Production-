// sw.js — Workbox 7.0.0 CDN Service Worker
// Source: https://developer.chrome.com/docs/workbox/modules/workbox-sw
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// 새 SW 즉시 활성화
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// index.html (navigation request) — NetworkFirst 5초 타임아웃
// D-04 discretion: 온라인 시 최신 버전 제공, 오프라인 시 캐시 폴백
workbox.routing.registerRoute(
  ({request}) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// 폰트 (Pretendard CDN) — CacheFirst 30일
workbox.routing.registerRoute(
  ({request}) => request.destination === 'font',
  new workbox.strategies.CacheFirst({
    cacheName: 'fonts-v1',
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Supabase API — NetworkOnly (D-03: 캐싱 안 함, 항상 최신 데이터)
workbox.routing.registerRoute(
  ({url}) => url.hostname.includes('supabase.co'),
  new workbox.strategies.NetworkOnly()
);
