// Service worker: cache the shell and the three JSON files, so a second load
// works offline.
//
// Shell files are cache first, because they only change when the cache name
// changes. The data files are stale while revalidate: offline gets the last
// snapshot, online quietly picks up a newer one.

const VERSION = 'v1';
const SHELL_CACHE = `weekprices-shell-${VERSION}`;
const DATA_CACHE = `weekprices-data-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './styles/label.css',
  './src/ui/app.js',
  './src/ui/format.js',
  './src/ui/match.js',
  './src/ui/offers.js',
  './src/ui/recipes.js',
  './src/adapters/store-adapter.js',
  './src/adapters/seed-adapter.js',
];

const DATA = [
  './data/ingredients.json',
  './data/offers.json',
  './data/recipes.json',
];

const isData = (url) => /\/data\/[^/]+\.json$/.test(new URL(url).pathname);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // addAll is all or nothing, so each file is added on its own and a single
    // miss does not block the install.
    await Promise.all(SHELL.map((path) =>
      shell.add(new Request(path, { cache: 'reload' }))
        .catch((err) => console.warn('[sw] shell miss', path, err.message))));

    const data = await caches.open(DATA_CACHE);
    await Promise.all(DATA.map((path) =>
      data.add(new Request(path, { cache: 'reload' }))
        .catch((err) => console.warn('[sw] data miss', path, err.message))));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, DATA_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.map((n) => (keep.has(n) ? null : caches.delete(n))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isData(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  const fresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  const res = hit ?? (await fresh);
  if (res) return res;
  return new Response('{"error":"offline and nothing cached"}', {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    return new Response('Offline and not cached.', { status: 503 });
  }
}

async function navigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match('./index.html')) ?? (await cache.match('./'));
    return hit ?? new Response('Offline and the shell is not cached.', { status: 503 });
  }
}
