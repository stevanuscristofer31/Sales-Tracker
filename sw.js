/* ============================================================================
 *  SERVICE WORKER — membuat aplikasi bisa dipasang di layar utama dan tetap
 *  terbuka saat sinyal hilang. Data transaksi TIDAK disimpan di sini; hanya
 *  berkas tampilan (HTML, CSS, JS, ikon, huruf).
 *
 *  Setiap kali Anda mengunggah versi baru aplikasi, naikkan angka VERSI.
 * ========================================================================== */
const VERSI = 'dst-v1';
const BERKAS = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(BERKAS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // kiriman data ke Apps Script tidak pernah di-cache
  const url = new URL(req.url);
  const huruf = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !huruf) return;

  if (huruf) {                                            // huruf: pakai simpanan dulu
    e.respondWith(caches.open(VERSI).then((c) => c.match(req).then((ada) => ada ||
      fetch(req).then((res) => { c.put(req, res.clone()); return res; }))));
    return;
  }
  // berkas aplikasi: ambil yang terbaru dulu, pakai simpanan kalau tidak ada sinyal
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const salin = res.clone(); caches.open(VERSI).then((c) => c.put(req, salin)); }
    return res;
  }).catch(() => caches.match(req).then((ada) => ada || caches.match('index.html'))));
});
