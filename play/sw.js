// Service worker of Monster Bouncer: precaches the whole app shell (every module, the stylesheets, the bundled fonts and the
// icons) so the game opens offline after the first visit; network-first for same-origin GET (fresh code always wins when
// online), cache-first for the bundled /fonts/, offline fallback to index.html for navigations. Bump CACHE on a release
// to drop everything an older version cached (older 'mbouncer-' caches are deleted on activate).
// Web only: the native app (Capacitor iOS) ships every file in its binary and never registers this worker (index.html
// skips the registration there and drops any old one), so nothing here runs inside the app.
'use strict';

const CACHE = 'mbouncer-v9';
const OWN_PREFIXES = ['mbouncer-'];   // only this game's caches are ever dropped (the origin may host other apps)
const FONT_PATH = '/fonts/';
const PRECACHE = [
  './', './index.html', './manifest.json',
  './css/app.css', './css/fonts.css',
  './js/main.js', './js/engine.js', './js/native.js',
  './js/core/audio.js', './js/core/camera.js', './js/core/draw.js', './js/core/i18n.js', './js/core/input.js', './js/core/loop.js',
  './js/core/math.js', './js/core/particles.js', './js/core/post.js', './js/core/save.js', './js/core/scene.js', './js/core/stage.js',
  './js/core/text.js', './js/core/tween.js', './js/core/ads.js',
  './js/game/actor.js', './js/game/data.js', './js/game/icons.js', './js/game/party.js', './js/game/profile.js', './js/game/share.js',
  './js/game/strings.js', './js/game/tutorial.js', './js/game/world.js', './js/game/logo.js',
  './js/game/catalog.js', './js/game/economy.js', './js/game/payments.js', './js/game/iap.js', './js/game/cosmetics-art.js',
  './js/game/strings-boosters.js', './js/game/strings-shopui.js', './js/game/strings-cosmetics.js', './js/game/strings-economy.js',
  './js/scenes/boot.js', './js/scenes/collection.js', './js/scenes/home.js', './js/scenes/pause.js', './js/scenes/play.js',
  './js/scenes/result.js', './js/scenes/settings.js', './js/scenes/shop.js',
  './fonts/baloo2-800-latin.woff2', './fonts/baloo2-800-latin-ext.woff2',
  './fonts/cairo-var-arabic.woff2', './fonts/cairo-var-latin.woff2', './fonts/cairo-var-latin-ext.woff2',
  './fonts/poppins-500-latin.woff2', './fonts/poppins-500-latin-ext.woff2', './fonts/poppins-600-latin.woff2', './fonts/poppins-600-latin-ext.woff2',
  './fonts/poppins-700-latin.woff2', './fonts/poppins-700-latin-ext.woff2', './fonts/poppins-800-latin.woff2', './fonts/poppins-800-latin-ext.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/apple-touch-icon.png', './icons/favicon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // each entry on its own so one missing file never blocks the install
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

function ownOld(key) {
  if (key === CACHE) return false;
  for (let i = 0; i < OWN_PREFIXES.length; i++) if (key.indexOf(OWN_PREFIXES[i]) === 0) return true;
  return false;
}

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(ownOld).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf(FONT_PATH) !== -1) { event.respondWith(cacheFirst(req)); return; }
  event.respondWith(networkFirst(req));
});

function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => { putIfOk(req, res); return res; }).catch(() => offline()));
}

function networkFirst(req) {
  return fetch(req)
    .then(res => { putIfOk(req, res); return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('./index.html', { ignoreSearch: true }).then(page => page || offline());
      return offline();
    }));
}

function putIfOk(req, res) {
  if (!res || res.status !== 200 || res.type !== 'basic') return;
  const copy = res.clone();
  caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => undefined);
}

function offline() {
  return new Response('Offline', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain' } });
}
