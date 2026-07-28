'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Share, Loader2 } from 'lucide-react'
import { usePushNotifications, esIOSSinInstalar } from '@/hooks/usePushNotifications'

const CLAVE_DESCARTADO = 'fno_push_prompt_descartado'

/**
 * Invitación a activar las notificaciones, arriba de todo en el dashboard.
 *
 * El toggle vive enterrado en Perfil y en la práctica nadie llega hasta ahí,
 * así que la adopción era nula. Acá aparece solo, una vez, y se puede
 * descartar: si el usuario dice que no, no vuelve a molestar.
 */
export function PushPrompt({ empleadoId }: { empleadoId: string | undefined }) {
  const { status, error, subscribe } = usePushNotifications(empleadoId)
  const [descartado, setDescartado] = useState(true) // asumimos oculto hasta leer localStorage
  const [activando, setActivando] = useState(false)
  const [iosSinInstalar, setIosSinInstalar] = useState(false)

  useEffect(() => {
    // En el server no hay localStorage; se resuelve recién en el cliente para
    // no romper la hidratación.
    setDescartado(localStorage.getItem(CLAVE_DESCARTADO) === '1')
    setIosSinInstalar(esIOSSinInstalar())
  }, [])

  function descartar() {
    localStorage.setItem(CLAVE_DESCARTADO, '1')
    setDescartado(true)
  }

  async function activar() {
    setActivando(true)
    try {
      await subscribe()
    } finally {
      setActivando(false)
    }
  }

  if (descartado || !empleadoId) return null
  // Sólo se ofrece cuando hay algo que activar: si ya está suscrito, si el
  // permiso está bloqueado o si todavía se está verificando, no molestamos.
  if (status === 'subscribed' || status === 'denied' || status === 'loading') return null
  if (status === 'unsupported' && !iosSinInstalar) return null

  const enIOS = status === 'unsupported' && iosSinInstalar

  return (
    <div className="mb-4 rounded-2xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
          {enIOS
            ? <Share className="w-4 h-4 text-white" />
            : <Bell className="w-4 h-4 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {enIOS ? 'Activá los avisos en tu iPhone' : '¿Querés recibir avisos en este dispositivo?'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {enIOS
              ? <>Tocá <strong>Compartir</strong> y después <strong>&quot;Agregar a inicio&quot;</strong>. Abrí el portal desde ese ícono y vas a poder activarlos.</>
              : 'Te avisamos cuando haya novedades, recibos nuevos o respuestas a tus solicitudes, aunque tengas el portal cerrado.'}
          </p>

          {error && <p className="text-xs text-red-500 dark:text-red-400 mt-2">{error}</p>}

          {!enIOS && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={activar}
                disabled={activando}
                className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-60"
              >
                {activando && <Loader2 className="w-3 h-3 animate-spin" />}
                {activando ? 'Activando...' : 'Activar'}
              </button>
              <button onClick={descartar} className="text-xs text-slate-500 dark:text-slate-400 hover:underline px-2">
                Ahora no
              </button>
            </div>
          )}
        </div>

        <button
          onClick={descartar}
          aria-label="Cerrar"
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
