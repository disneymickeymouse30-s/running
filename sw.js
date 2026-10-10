/* RUNNING TRAINING LOG — オフライン起動用（任意）。
   running-training-log.html と同じフォルダに置くと、一度開いたページをキャッシュし、
   電波がないときもキャッシュから起動できるようにします。データ（記録）はIndexedDBにあり、ここでは扱いません。 */
const CACHE = 'rtl-cache-v1';
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const cl = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    await Promise.all(cl.map(x => c.add(x.url.split('#')[0]).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    // ページ本体：ネットワーク優先（更新を反映）、つながらなければキャッシュ
    e.respondWith(fetch(r).then(res => {
      if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(async () => (await caches.match(r, { ignoreSearch: true })) ||
      new Response('オフラインのため読み込めません。一度オンラインで開いてから再度お試しください。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
    return;
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    // 数字用フォント：キャッシュ優先（無くても端末のフォントで表示されます）
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
  }
});
