'use client'

import { useState } from 'react'
import { Bell, BellOff, BellRing, Loader2, Share } from 'lucide-react'
import { usePushNotifications, esIOSSinInstalar } from '@/hooks/usePushNotifications'

export function PushToggle({ empleadoId }: { empleadoId: string }) {
  const { status, error, subscribe, unsubscribe } = usePushNotifications(empleadoId)
  const [subscribing, setSubscribing] = useState(false)

  const handleSubscribe = async () => {
    setSubscribing(true)
    await subscribe()
    setSubscribing(false)
  }

  // En iPhone la API no existe hasta que el portal se agrega a la pantalla de
  // inicio. Explicamos cómo hacerlo en vez de ocultar la sección sin más.
  if (status === 'unsupported' && esIOSSinInstalar()) {
    return (
      <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Share className="w-4 h-4 mt-0.5 shrink-0 text-brand-600" />
        <span>
          Para recibir notificaciones en iPhone hay que agregar el portal a la pantalla de inicio:
          tocá <strong>Compartir</strong> y después <strong>&quot;Agregar a inicio&quot;</strong>. Abrilo desde ahí y volvé a esta pantalla.
        </span>
      </div>
    )
  }

  if (status === 'unsupported') return null

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Verificando notificaciones...</span>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
        <BellOff className="w-4 h-4" />
        <span>Notificaciones bloqueadas en el navegador. Desbloqueá el permiso desde la configuración del sitio.</span>
      </div>
    )
  }

  if (status === 'subscribed') {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-slate-700 dark:text-slate-300">Notificaciones push activadas</span>
        </div>
        <button
          onClick={unsubscribe}
          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
        >
          Desactivar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Recibir notificaciones en este dispositivo</span>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={subscribing}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-60"
        >
          {subscribing && <Loader2 className="w-3 h-3 animate-spin" />}
          {subscribing ? 'Activando...' : 'Activar'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
