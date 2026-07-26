// Offline support for Piedmont Planner.
// Precaches the app shell and runtime-caches same-origin assets (plant icons,
// etc.) as they are requested, so the calendar works without a connection.
//
// Bump CACHE_VERSION whenever the shell changes to retire stale caches.
const CACHE_VERSION = 'piedmont-planner-v6';

const CORE_ASSETS = [
  './',
  'index.html',
  'styles.css',
  'script.js',
  'data.js',
  'app/main.js',
  'app/lib/types.js',
  'app/lib/crop-catalog.js',
  'app/lib/validate-pack.js',
  'app/lib/engine/resolve.js',
  'app/lib/engine/computed-rules.js',
  'app/lib/engine/climate-model.js',
  'app/lib/engine/suitability.js',
  'app/lib/engine/now.js',
  'app/lib/climate/crop-climate.js',
  'app/lib/providers/static.js',
  'app/lib/packs/piedmont-nc.js',
  'app/data/piedmont-pack.json',
  'app/data/frost-stations.json',
  'app/data/zone-points.json',
  'app/data/temp-normals.json',
  'manifest.webmanifest',
  'favicon.svg',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        // Only retire OUR OWN stale caches. On a shared origin (e.g.
        // jyvisuals.github.io hosts multiple projects) deleting every other
        // key would wipe unrelated apps' caches.
        keys
          .filter((key) => key.startsWith('piedmont-planner-') && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first, then network. Successful responses are cached for next time;
  // navigations fall back to the cached shell when offline.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || (request.mode === 'navigate' ? caches.match('index.html') : undefined));

      return cached || network;
    })
  );
});
