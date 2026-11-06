const CACHE_NAME = 'gencert-pwa-v4';

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

// 自アプリの古いキャッシュだけを削除
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

  // GET以外・外部サイトへの通信は対象外
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 自アプリ専用キャッシュを使用
  const cachePromise = caches.open(CACHE_NAME);

  // HTML画面：キャッシュ優先
  if (request.mode === 'navigate') {
    event.respondWith(
      cachePromise.then((cache) =>
        cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request).catch(() =>
            cache.match('./index.html').then((fallback) =>
              fallback || cache.match('./')
            )
          );
        })
      )
    );
    return;
  }

  // その他の静的ファイル：キャッシュ優先
  event.respondWith(
    cachePromise.then((cache) =>
      cache.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request);
      })
    )
  );
});