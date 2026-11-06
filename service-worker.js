const CACHE_NAME = 'gencert-pwa-v5';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時に必要なファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => {
          if (
            key.startsWith('gencert-pwa-') &&
            key !== CACHE_NAME
          ) {
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// オフライン対応
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  const cachePromise = caches.open(CACHE_NAME);

  // HTML画面：ネット優先、失敗したらキャッシュ
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            cachePromise.then((cache) =>
              cache.put(request, copy)
            );
          }
          return response;
        })
        .catch(() =>
          cachePromise.then((cache) =>
            cache.match(request).then((cached) =>
              cached || cache.match('./index.html')
            )
          )
        )
    );
    return;
  }

  // その他の静的ファイル：キャッシュ優先
  event.respondWith(
    cachePromise.then((cache) =>
      cache.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        });
      })
    )
  );
});
