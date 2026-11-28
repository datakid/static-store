const CACHE = 'shelf-6';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/apps.js', 'js/icons.js', 'js/qr.js', 'js/main.js', 'favicon.svg', 'manifest.webmanifest', 'images/contact-flow.jpg', 'fonts/geist.woff2', 'fonts/geist-mono.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(c =>
    fetch(req)
      .then(r => { if (r.ok) c.put(req, r.clone()); return r; })
      .catch(() => c.match(req, { ignoreSearch: true }).then(hit => hit || c.match('index.html')))
  ));
});
