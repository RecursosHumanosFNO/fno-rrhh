'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker que genera next-pwa.
 *
 * next-pwa v5 inyecta su script de registro en `_document`/`_app`, que son del
 * Pages Router. Este proyecto usa App Router, así que esa inyección nunca
 * ocurre y el SW no se registra solo: sin esto, `serviceWorker.ready` no
 * resuelve nunca y las notificaciones push no se pueden activar.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // En desarrollo next-pwa está deshabilitado y /sw.js no existe.
    if (process.env.NODE_ENV !== 'production') return

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('[SW] no se pudo registrar:', err)
      })
    }

    // Esperar al load para no competir con el render inicial.
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })

    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
