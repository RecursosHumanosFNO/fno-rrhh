'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/authFetch'

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
      // Obtener el SW registrado; si no hay uno activo en 5s, abortar con error claro
      let reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Service worker no disponible. Intentá recargar la página.')), 5000)
        )
        reg = await Promise.race([navigator.serviceWorker.ready, timeout])
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const res = await authFetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), empleadoId }),
      })
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
