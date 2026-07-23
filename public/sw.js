const CACHE_NAME = "sorteios-bomjesus-v1";

const STATIC_ASSETS = [
  "/favicon.ico",
  "/favicon-16.png",
  "/favicon-32.png",
  "/favicon-48.png",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Só intercepta ícones/estáticos do próprio app (cache-first). Páginas, Server
// Actions e chamadas ao Supabase seguem sempre direto pra rede — nunca servir
// placar, painel admin ou dado da API a partir de um cache antigo.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isCacheable =
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith("/_next/static/");

  if (!isCacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  );
});
