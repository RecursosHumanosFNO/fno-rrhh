// Service worker del portal (fuente). Serwist lo compila a public/sw.js e
// inyecta ahí el manifiesto de precache.
//
// Antes esto eran dos piezas: next-pwa generaba el sw.js y le pegaba adelante
// worker/index.js con los handlers de push. next-pwa está sin mantenimiento
// desde 2022 y arrastra Workbox 6; Serwist es su continuación y deja todo el
// worker en un solo archivo TypeScript, que además se typechequea.
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Lo inyecta Serwist en tiempo de build.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Mismo comportamiento que tenía next-pwa: el worker nuevo toma el control
  // sin esperar a que se cierren todas las pestañas.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

// Los caches que dejó next-pwa (Workbox 6) tienen otros nombres, así que Serwist
// no los toca y quedarían ocupando lugar para siempre en cada teléfono que ya
// tenía la app instalada. Se limpian una vez, al activar este worker.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys()
      await Promise.all(
        nombres
          // Sólo los de Workbox: los que empiezan con "next-" son los runtime
          // caches del propio Serwist y borrarlos acá los vaciaría en cada
          // activación.
          .filter((n) => n.startsWith('workbox-'))
          .map((n) => caches.delete(n)),
      )
    })(),
  )
})

// ── Web Push ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data: { title?: string; body?: string; url?: string; icon?: string; badge?: string }
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Portal FNO', body: event.data.text() }
  }

  const { title, body, url, icon, badge } = data
  event.waitUntil(
    self.registration.showNotification(title ?? 'Portal FNO', {
      body,
      icon: icon ?? '/icon-192.png',
      badge: badge ?? '/icon-192.png',
      data: { url: url ?? '/dashboard' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Absoluta: openWindow y navigate necesitan una URL completa.
  const destino = new URL(event.notification.data?.url ?? '/dashboard', self.location.origin).href

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

      // Buscamos cualquier ventana del portal, no una que "contenga" el destino:
      // antes se comparaba con url.includes(destino) y, como el destino por
      // defecto es /dashboard —que está en la ruta de todas las pantallas—,
      // siempre matcheaba y hacía focus() sin navegar. La app pasaba al frente
      // pero se quedaba donde estaba.
      const abierta = ventanas.find((c) => new URL(c.url).origin === self.location.origin)

      if (abierta) {
        // navigate() no existe en todos los navegadores (iOS incluido): si no
        // está, al menos traemos la ventana al frente.
        if ('navigate' in abierta) {
          const navegada = await abierta.navigate(destino).catch(() => null)
          if (navegada) return navegada.focus()
        }
        await abierta.focus()
        // Que la app decida la navegación cuando el SW no puede hacerla.
        abierta.postMessage({ tipo: 'navegar', url: destino })
        return
      }

      await self.clients.openWindow(destino)
    })(),
  )
})
