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
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(url) && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
