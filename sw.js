/* 오프라인 캐시용 서비스워커 (선택사항)
   index.html 과 같은 폴더에 두면 인터넷 없이도 앱이 열립니다. */
const CACHE = "monthly-check-v1";
const FILES = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) {
        // 캐시를 먼저 보여주고, 뒤에서 조용히 최신본으로 갱신
        fetch(e.request)
          .then((res) => caches.open(CACHE).then((c) => c.put(e.request, res)))
          .catch(() => {});
        return hit;
      }
      return fetch(e.request).catch(() => caches.match("./index.html"));
    })
  );
});
