// 深淵商会 — ServiceWorker (A2-PWA)
// 戦略: Cache First（オフライン動作優先）
//   - インストール時にゲーム本体を事前キャッシュ
//   - ネットワーク不達時はキャッシュから配信
//   - バージョン更新時は旧キャッシュを自動削除

const CACHE_NAME = 'shinentrade-v1';

const PRECACHE_URLS = [
  '/deeptrade/',
  '/deeptrade/index.html',
  '/deeptrade/ogp.png',
  '/deeptrade/manifest.json',
];

// ── インストール：事前キャッシュ ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  // 旧SWを待たずに即アクティベート
  self.skipWaiting();
});

// ── アクティベート：旧キャッシュ削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── フェッチ：Cache First ──
self.addEventListener('fetch', event => {
  // GETリクエストのみ対象（POST等のゲームロジックには干渉しない）
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // キャッシュになければネットワークから取得してキャッシュに追加
      return fetch(event.request).then(response => {
        // 正常レスポンスのみキャッシュ（エラーはスルー）
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});
