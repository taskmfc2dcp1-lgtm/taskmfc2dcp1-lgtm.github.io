/* オフライン動作用の簡易サービスワーカー。
   アプリ本体（HTML・アイコン・マニフェスト）をキャッシュし、
   ネットワークが無くても起動できるようにする。
   将来アプリを更新したら CACHE の版数字を1つ増やすと更新が反映される。 */
const CACHE = 'gakushu-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './version.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // version.json は更新検知に使うため常にネットワーク優先（キャッシュしない）
  if (e.request.url.indexOf('version.json') !== -1) {
    e.respondWith(fetch(e.request).catch(() => caches.match('./version.json')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
