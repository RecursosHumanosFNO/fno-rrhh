'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Registra el service worker que genera next-pwa.
 *
 * next-pwa v5 inyecta su script de registro en `_document`/`_app`, que son del
 * Pages Router. Este proyecto usa App Router, así que esa inyección nunca
 * ocurre y el SW no se registra solo: sin esto, `serviceWorker.ready` no
 * resuelve nunca y las notificaciones push no se pueden activar.
 */
export function ServiceWorkerRegister() {
  const router = useRouter()

  // Cuando el usuario toca una notificación y ya hay una ventana abierta, el
  // service worker no siempre puede navegarla (client.navigate no existe en
  // iOS). En ese caso nos avisa por postMessage y navegamos desde acá.
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.tipo !== 'navegar' || typeof ev.data.url !== 'string') return
      try {
        const destino = new URL(ev.data.url)
        // Sólo rutas del propio portal: el mensaje no deja de ser una entrada
        // externa y no queremos que empuje a otro sitio.
        if (destino.origin !== window.location.origin) return
        router.push(destino.pathname + destino.search)
      } catch { /* URL inválida: se ignora */ }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [router])

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
