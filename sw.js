'use strict';

importScripts('./voices.js');

const scopeURL = new URL(self.registration.scope);
const cachePrefix = 'solar-myth-atlas:' + encodeURIComponent(scopeURL.pathname) + ':';
const cacheName = cachePrefix + '2026-11-27.3';
const indexURL = new URL('./index.html', scopeURL).href;
const shell = [
  './index.html', './styles.css', './app.js', './bodies.js', './voices.js',
  './scene.webp', './planets.webp', './practice.js', './app.webmanifest', './icon-180.png', './icon-192.png',
  './icon-512.png', './install-qr.png', './sw.js'
];
const audioFiles = Object.values(globalThis.VOICES);
const assetURLs = new Set([...shell, ...audioFiles].map(path => new URL(path, scopeURL).href));

async function installAssets() {
  if (!audioFiles.length) throw new Error('The atlas audio inventory is empty');
  const cache = await caches.open(cacheName);
  const urls = Array.from(assetURLs);
  // A version activates only after all its media and pages have been saved.
  // Small batches keep the download usable on a phone and allow a partial install to retry.
  for (let offset = 0; offset < urls.length; offset += 6) {
    await Promise.all(urls.slice(offset, offset + 6).map(async url => {
      if (await cache.match(url)) return;
      const response = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin' }));
      if (response.status !== 200 || response.redirected) throw new Error('Incomplete atlas file ' + url);
      await cache.put(url, response);
    }));
  }
}

self.addEventListener('install', event => {
  event.waitUntil(installAssets());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Let existing tabs finish with their installed version before the browser activates the next.
    const old = (await caches.keys()).filter(name => name.startsWith(cachePrefix) && name !== cacheName);
    await Promise.all(old.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function audioRange(response, header) {
  const data = await response.blob();
  const size = data.size;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  const unsatisfied = () => new Response(null, {
    status: 416,
    headers: { 'Content-Range': 'bytes */' + size, 'Accept-Ranges': 'bytes' }
  });
  if (!match || (!match[1] && !match[2]) || !size) return unsatisfied();
  let start;
  let end;
  if (match[1]) {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start >= size || start > end) return unsatisfied();
    end = Math.min(end, size - 1);
  } else {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix < 1) return unsatisfied();
    start = Math.max(0, size - suffix);
    end = size - 1;
  }
  return new Response(data.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Accept-Ranges': 'bytes', 'Content-Type': 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1)
    }
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  const key = url.href === scopeURL.href ? indexURL : url.href;
  if (!assetURLs.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(key);
    if (!cached) return fetch(request);
    const range = request.headers.get('range');
    return range && url.pathname.endsWith('.mp3') ? audioRange(cached, range) : cached;
  })());
});
