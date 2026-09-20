/*
  Carbon Copy service worker.

  Two caches with different rules, because the two kinds of asset age
  differently:

  - the shell (HTML, JS, CSS, fonts) is hashed at build time, so it is safe to
    serve cache-first and revalidate in the background;
  - the record (/data/*.json) is immutable for the life of a deploy, so it is
    cached permanently and only evicted when the version below changes.
*/
const VERSION = 'cc-v2';
const SHELL = `${VERSION}-shell`;
const RECORD = `${VERSION}-record`;

const PRECACHE = ['/', '/index.html', '/favicon.svg', '/data/core.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The record: immutable, so cache-first with no revalidation.
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(RECORD).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navigations: network first so a new deploy is picked up immediately,
  // falling back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error())),
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith(
    caches.open(SHELL).then(async (cache) => {
      const hit = await cache.match(request);
      const net = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
