/* 오프라인 캐시용 서비스워커 (v2)
   ─ 앱 화면(HTML)은 항상 최신을 먼저 받아오고, 인터넷이 없을 때만 캐시를 씁니다.
     → 파일을 새로 올리면 앱이 바로 최신 버전으로 바뀝니다.
   ─ 아이콘 같은 나머지 파일은 캐시를 먼저 써서 빠르게 열고, 뒤에서 조용히 갱신합니다. */

const CACHE = "monthly-check-v4";          // ← 내용을 크게 바꿀 땐 이 숫자를 올리세요
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES).catch(() => {}))
  );
  self.skipWaiting();                       // 새 버전을 곧바로 적용
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))   // 예전 캐시 삭제
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage =
    req.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".json");

  if (isPage) {
    // 최신 우선 — 인터넷이 되면 항상 새 버전
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  // 그 외(아이콘 등) — 캐시 우선, 뒤에서 갱신
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
