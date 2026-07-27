'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/authFetch'
import { conTimeout } from '@/lib/utils'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'

// En iPhone/iPad el push web sólo existe si el portal está agregado a la
// pantalla de inicio; en una pestaña de Safari el navegador ni expone la API.
// Sin este chequeo el usuario sólo ve "no compatible" y no sabe qué hacer.
export function esIOSSinInstalar(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const esIOS = /iPad|iPhone|iPod/.test(ua)
    // iPadOS se hace pasar por Mac; se lo detecta por el soporte táctil.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!esIOS) return false
  const instalado = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true
  return !instalado
}

export function usePushNotifications(empleadoId: string | undefined) {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        setStatus('unsubscribed')
        return
      }
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'subscribed' : 'unsubscribed')
    } catch {
      setStatus('unsubscribed')
    }
  }, [])

  useEffect(() => { checkStatus() }, [checkStatus])

  const subscribe = useCallback(async () => {
    if (!empleadoId) return
    setError(null)
    try {
      if (!VAPID_PUBLIC_KEY) throw new Error('VAPID key no configurada. Contactá a RRHH.')

      // El permiso se pide PRIMERO y sin ningún await por delante: Safari exige
      // que la llamada salga del gesto del usuario, y si la precede un await
      // considera que ya no lo es y la rechaza.
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        setStatus(permiso === 'denied' ? 'denied' : 'unsubscribed')
        return
      }

      // Registrar el SW si todavía no lo está en vez de sólo esperarlo: en la
      // primera visita puede no haber terminado de instalarse.
      let reg = await navigator.serviceWorker.getRegistration()
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js').catch(() => undefined)

      // pushManager sólo funciona con el SW activo, y la activación es el paso
      // que más se cuelga (sobre todo en iOS la primera vez).
      const listo = await conTimeout(
        navigator.serviceWorker.ready,
        20000,
        'El service worker no terminó de activarse. Cerrá y volvé a abrir el portal, y probá de nuevo.',
      )
      reg = reg ?? listo

      const sub = await conTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }),
        20000,
        'El navegador no respondió al pedido de suscripción. Probá de nuevo.',
      )

      const res = await conTimeout(
        authFetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), empleadoId }),
        }),
        20000,
        'No se pudo guardar la suscripción (sin respuesta del servidor).',
      )
      if (!res.ok) throw new Error(`Error al guardar suscripción (${res.status})`)
      setStatus('subscribed')
    } catch (err) {
      console.error('[PushToggle] subscribe error:', err)
      if (Notification.permission === 'denied') {
        setStatus('denied')
      } else {
        setError(err instanceof Error ? err.message : 'Error al activar notificaciones')
        setStatus('unsubscribed')
      }
    }
  }, [empleadoId])

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await authFetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch {
      setStatus('unsubscribed')
    }
  }, [])

  return { status, error, subscribe, unsubscribe }
}
