'use client'

import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function PushToggle({ empleadoId }: { empleadoId: string }) {
  const { status, subscribe, unsubscribe } = usePushNotifications(empleadoId)

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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">Recibir notificaciones en este dispositivo</span>
      </div>
      <button
        onClick={subscribe}
        className="btn-primary text-xs py-1.5 px-3"
      >
        Activar
      </button>
    </div>
  )
}
