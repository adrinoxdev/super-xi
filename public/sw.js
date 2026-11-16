// Service worker do Super XI: deixa o jogo instalável e abrindo sem internet.
//
// - na instalação guarda o jogo inteiro (index.html, arquivo principal e os arquivos de cada tela), então ele abre
//   offline já na primeira visita, em qualquer tela.
// - index.html (navegação): rede primeiro, cache como reserva. Assim cada lançamento novo aparece na hora.
// - /assets/*: nomes com hash do Vite, nunca mudam de conteúdo: cache primeiro.
// - demais arquivos do próprio site e fontes do Google: devolve o cache e atualiza em segundo plano.
// O save do jogo fica no localStorage e não passa por aqui.
//
// Mude VERSION só se alterar a lógica deste arquivo: o número novo descarta os caches antigos.
const VERSION = 'v1'
const SHELL_CACHE = `superxi-shell-${VERSION}`
const RUNTIME_CACHE = `superxi-runtime-${VERSION}`

const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './favicon.png']
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

const INDEX_URL = () => new URL('./index.html', self.registration.scope).href

// Guarda o build inteiro. O index.html aponta o arquivo principal; dentro dele (e dentro de cada arquivo de tela) o Vite
// escreve os outros como "./Nome-hash.js", então seguimos essas referências até não sobrar nenhuma. Cada arquivo é
// baixado uma vez só: a cópia vai para o cache e o texto serve para achar os próximos.
async function precacheBuild() {
  try {
    const runtime = await caches.open(RUNTIME_CACHE)
    const html = await (await fetch(INDEX_URL(), { cache: 'no-cache' })).text()
    const queue = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+\.(?:js|css))"/g)].map(
      (m) => new URL(m[1], self.registration.scope).href
    )
    const seen = new Set(queue)
    while (queue.length && seen.size < 200) {
      const url = queue.shift()
      let res
      try {
        res = await fetch(url)
      } catch {
        continue // falhou: entra no cache na primeira vez que for usado
      }
      if (!res.ok) continue
      await runtime.put(url, res.clone())
      if (!url.endsWith('.js')) continue
      const code = await res.text()
      for (const m of code.matchAll(/["'`]\.\/([A-Za-z0-9_.\-]+\.(?:js|css))["'`]/g)) {
        const next = new URL(m[1], url).href
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
  } catch {
    /* sem rede na instalação: o cache vai se formando conforme o uso */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(precacheBuild)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const cacheable = (res) => res && (res.ok || res.type === 'opaque')

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const res = await fetch(request)
    if (res.ok) {
      cache.put(INDEX_URL(), res.clone())
      return res
    }
    // resposta de erro: usa a cópia guardada, se houver (todo o jogo é uma página só, as rotas ficam no #)
    return (await cache.match(INDEX_URL())) || res
  } catch {
    return (await cache.match(INDEX_URL())) || (await cache.match(self.registration.scope)) || Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const hit = await cache.match(request, { ignoreVary: true })
  if (hit) return hit
  const res = await fetch(request)
  if (cacheable(res)) cache.put(request, res.clone())
  return res
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const hit = await cache.match(request, { ignoreVary: true })
  const refresh = fetch(request)
    .then((res) => {
      if (cacheable(res)) cache.put(request, res.clone())
      return res
    })
    .catch(() => null)
  return hit || (await refresh) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }
  if (url.origin !== self.location.origin) return // outros domínios: segue direto para a rede

  if (url.pathname.includes('/assets/')) event.respondWith(cacheFirst(request))
  else event.respondWith(staleWhileRevalidate(request))
})
