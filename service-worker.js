/* KMT Service Worker (stable / domain+project compatible) */
/* - Works on:
     1) https://계명태권도.com/          (BASE="/")
     2) https://...github.io/kmt-landing/ (BASE="/kmt-landing/")
*/

const CACHE_NAME = "kmt-cache-v2";

/**
 * ✅ BASE 자동 판별
 * - 도메인 루트로 붙으면: "/"
 * - 프로젝트 경로로 붙으면: "/kmt-landing/"
 */
const BASE = (() => {
  const path = self.location.pathname || "/";
  // service-worker.js가 /kmt-landing/service-worker.js 처럼 있을 때 대응
  if (path.includes("/kmt-landing/")) return "/kmt-landing/";
  // 기본은 루트 도메인
  return "/";
})();

/**
 * ✅ 설치 시 캐시할 핵심 자원
 * - 절대경로(BASE 포함)로 구성
 * - 존재하지 않는 경로가 섞이면 install이 통째로 실패하므로
 *   "필수"만 최소화 + 실패 허용 방식으로 처리
 */
const CORE_ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "notice/data.js",
  BASE + "assets/icons/icon-192.png",
  BASE + "assets/icons/icon-512.png"
];

/** 유틸: 요청이 HTML 문서인지 */
function isHTMLRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

/** 유틸: 캐시에 넣어도 되는 응답인지 (에러/opaque 제외) */
function isCacheableResponse(res) {
  // ok(200~299)만 캐시. (404/500 캐시 방지)
  // type === "opaque" (CORS 불가)도 캐시 제외(문제 방지)
  return res && res.ok && res.type !== "opaque";
}

/** 설치 */
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // ✅ addAll은 하나라도 실패하면 install 전체가 실패할 수 있음.
    // 그래서 개별 fetch로 "실패해도 계속" 진행합니다.
    await Promise.all(
      CORE_ASSETS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (isCacheableResponse(res)) await cache.put(url, res);
        } catch (e) {
          // 실패해도 설치는 계속 진행 (도메인/경로 차이, 일시적 네트워크 등 대비)
        }
      })
    );
  })());

  self.skipWaiting();
});

/** 활성화 */
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

/** fetch 전략 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ 같은 출처만
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);

    // ✅ HTML: 네트워크 우선(최신) → 실패 시 캐시/홈으로 폴백
    if (isHTMLRequest(req)) {
      try {
        const res = await fetch(req);
        if (isCacheableResponse(res)) {
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        // 페이지 요청 실패 시 캐시된 페이지 or 홈(index.html)
        return cached || (await cache.match(BASE + "index.html")) || (await caches.match(BASE)) || Response.error();
      }
    }

    // ✅ 기타(이미지/JS/CSS): 캐시 우선 → 없으면 네트워크 → 성공하면 캐시
    if (cached) {
      // 백그라운드 갱신(조용히 최신화)
      event.waitUntil((async () => {
        try {
          const res = await fetch(req);
          if (isCacheableResponse(res)) await cache.put(req, res.clone());
        } catch (e) {}
      })());
      return cached;
    }

    // 캐시에 없으면 네트워크로 받고 캐시
    try {
      const res = await fetch(req);
      if (isCacheableResponse(res)) await cache.put(req, res.clone());
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});
