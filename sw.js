// PlannerPro Service Worker
// 版本号：每次更新资源时递增，旧缓存会自动清除
const CACHE_NAME = 'plannerpro-v1';

// 需要预缓存的核心资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ========== Install：预缓存核心资源 ==========
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ========== Activate：清除旧版本缓存 ==========
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ========== Fetch：网络优先，失败时回退缓存 ==========
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 外部 CDN 资源（bootcdn 等）：网络优先，缓存兜底
  const url = new URL(event.request.url);
  const isCDN = url.hostname.includes('bootcdn') || url.hostname.includes('cdn');

  if (isCDN) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 本地资源：Cache First（缓存优先），回退到网络并更新缓存
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});
