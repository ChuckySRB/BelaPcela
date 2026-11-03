import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/** Precache only files produced by this build. Never intercept Blob URLs or family data. */
export function offlineShell(): Plugin {
  let publicDir = '';
  return { name: 'belapcela-offline-shell', apply: 'build', configResolved(config) { publicDir = config.publicDir; }, generateBundle: { order: 'post', handler(_, bundle) {
    const publicAssets = ['seal.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'licenses/THIRD_PARTY_NOTICES.txt', 'licenses/PT-Sans-OFL.txt', 'licenses/PT-Serif-OFL.txt'];
    const assets = [...Object.keys(bundle), ...publicAssets].filter(path => !path.endsWith('.map'));
    const hash = createHash('sha256').update(JSON.stringify(bundle));
    for (const path of publicAssets) hash.update(readFileSync(resolve(publicDir, path)));
    const version = hash.digest('hex').slice(0, 16);
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const PREFIX = 'belapcela-shell-' + new URL(self.registration.scope).pathname + '-';
const CACHE = PREFIX + '${version}';
const ASSETS = ${JSON.stringify(assets)}.map(path => new URL(path, self.registration.scope).href);
const INDEX = new URL('index.html', self.registration.scope).href;
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const previous = (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE);
  for (const key of previous.slice(0, -1)) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') event.waitUntil(self.skipWaiting()); });
self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(INDEX)).then(cached => cached || fetch(request))); return;
  }
  if (ASSETS.includes(url.href) || url.pathname.startsWith(new URL('assets/', self.registration.scope).pathname)) event.respondWith((async () => {
    const names = [CACHE, ...(await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE)];
    for (const name of names) {
      const cached = await (await caches.open(name)).match(request, { ignoreVary: true });
      if (cached) return cached;
    }
    return fetch(request);
  })());
});
` });
  } } };
}
