// Custom service worker — maneja eventos push de Web Push API
// next-pwa v5 inyecta el código workbox antes de este archivo

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data
  try { data = event.data.json() } catch { data = { title: 'Portal FNO', body: event.data.text() } }

  const { title, body, url, icon, badge } = data
  event.waitUntil(
    self.registration.showNotification(title ?? 'Portal FNO', {
      body,
      icon: icon ?? '/icon-192.png',
      badge: badge ?? '/icon-192.png',
      data: { url: url ?? '/dashboard' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Absoluta: openWindow y navigate necesitan una URL completa.
  const destino = new URL(event.notification.data?.url ?? '/dashboard', self.location.origin).href

  event.waitUntil((async () => {
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

    return self.clients.openWindow(destino)
  })())
})
