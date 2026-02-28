/* KMT Service Worker (basic) */
const CACHE_NAME = "kmt-cache-v1";
const BASE = "/kmt-landing/";

const CORE_ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "service-worker.js",
  BASE + "notice/data.js",
  BASE + "assets/icons/icon-192.png",
  BASE + "assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 같은 출처만 캐시 전략 적용
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // HTML은 네트워크 우선(최신), 실패 시 캐시
      if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
        return fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => cached || caches.match(BASE + "index.html"));
      }

      // 그 외는 캐시 우선 + 백그라운드 갱신
      return (
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
      );
    })
  );
});
