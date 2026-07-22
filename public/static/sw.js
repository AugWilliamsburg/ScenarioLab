// ================================================================
//  シナリオラボ Service Worker
//  目的：ホーム画面に追加した際の「ネイティブアプリらしい起動体験」
//  （オフライン/不安定回線でも真っ白にならず即座に前回の画面が出る）
//  を提供する。データはすべてlocalStorage側にあり、SW側は
//  「配信アセット（HTML/CSS/JS/アイコン）」のキャッシュのみを担当する。
//
//  戦略：
//  - ナビゲーション（HTML）: network-first。オフライン時のみキャッシュ
//    フォールバック。常に最新版を優先するため、通常時はキャッシュに
//    頼らない（アプリ更新の反映漏れを避ける）。
//  - 静的アセット（/static/app.js, /static/app.css, /static/icons/*）:
//    stale-while-revalidate。まずキャッシュを即返して起動を速くし、
//    裏で最新版を取得してキャッシュを更新する（次回起動で反映）。
//  - /api/* は一切キャッシュしない（PDF抽出プロキシ等の動的処理）。
// ================================================================

const CACHE_NAME = 'scenario-lab-v1';
const CORE_ASSETS = [
  '/',
  '/static/app.css',
  '/static/app.js',
  '/static/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST等（PDF抽出など）は素通し

  const url = new URL(req.url);

  // 他オリジン（CDN等）やAPIはSWのキャッシュ対象外（ブラウザ標準の挙動に任せる）
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // ナビゲーション（HTML本体）: network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // 静的アセット: stale-while-revalidate
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const networkFetch = fetch(req)
            .then((resp) => {
              if (resp && resp.ok) cache.put(req, resp.clone());
              return resp;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
  }
});
