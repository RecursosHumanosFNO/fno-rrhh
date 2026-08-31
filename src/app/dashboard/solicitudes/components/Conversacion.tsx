'use client'

import { useState } from 'react'
import { MessageSquare, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { formatFecha } from '@/lib/utils'
import type { MensajeSolicitud } from '@/types'

function horaDe(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Conversación de una solicitud: el ida y vuelta entre RRHH y el empleado
 * mientras todavía no se puede aprobar ni rechazar.
 *
 * Antes sólo había dos botones y un comentario: si la solicitud no se resolvía
 * en un mensaje, no quedaba a dónde seguir. Ahora RRHH puede dejarla en revisión
 * con una pregunta, el empleado contesta, y recién cuando está claro se cierra.
 */
export function Conversacion({ mensajes, abierta, puedeEscribir, puedeCerrar, onEnviar }: {
  mensajes: MensajeSolicitud[]
  abierta: boolean
  puedeEscribir: boolean
  puedeCerrar: boolean
  onEnviar: (texto: string, cerrarComo?: 'aprobado' | 'rechazado') => Promise<boolean>
}) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState<'mensaje' | 'aprobado' | 'rechazado' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function enviar(cerrarComo?: 'aprobado' | 'rechazado') {
    const limpio = texto.trim()
    // Al cerrar, el texto es opcional: puede no haber nada que aclarar.
    if (!limpio && !cerrarComo) return
    setEnviando(cerrarComo ?? 'mensaje')
    setError(null)
    const ok = await onEnviar(limpio || (cerrarComo === 'aprobado' ? 'Aprobada.' : 'Rechazada.'), cerrarComo)
    setEnviando(null)
    if (ok) setTexto('')
    else setError('No se pudo enviar. Probá de nuevo.')
  }

  if (!mensajes.length && !puedeEscribir) return null

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" /> Conversación
      </p>

      {mensajes.length > 0 && (
        <div className="space-y-2">
          {mensajes.map((m, i) => {
            const deRRHH = m.de === 'rrhh'
            return (
              <div
                key={`${m.fecha}-${i}`}
                className={`rounded-xl p-3 border ${
                  deRRHH
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <p className={`text-xs font-semibold ${
                    deRRHH ? 'text-brand-700 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    {deRRHH ? 'RRHH' : m.autor || 'Empleado'}
                  </p>
                  <p className="text-xs text-slate-400 shrink-0">
                    {formatFecha(m.fecha.slice(0, 10))} · {horaDe(m.fecha)}
                  </p>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{m.texto}</p>
              </div>
            )
          })}
        </div>
      )}

      {puedeEscribir && abierta && (
        <div className="space-y-2">
          <textarea
            className="form-input text-sm resize-none"
            rows={2}
            placeholder={puedeCerrar
              ? 'Escribí una pregunta o el motivo de la resolución...'
              : 'Escribí tu respuesta para RRHH...'}
            value={texto}
            onChange={e => setTexto(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => enviar()}
              disabled={!!enviando || !texto.trim()}
              className="btn-secondary text-sm py-1.5 disabled:opacity-60"
            >
              {enviando === 'mensaje' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {puedeCerrar ? 'Enviar y dejar en revisión' : 'Enviar respuesta'}
            </button>
            {puedeCerrar && (
              <>
                <button
                  onClick={() => enviar('aprobado')}
                  disabled={!!enviando}
                  className="btn-success text-sm py-1.5 disabled:opacity-60"
                >
                  {enviando === 'aprobado' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar
                </button>
                <button
                  onClick={() => enviar('rechazado')}
                  disabled={!!enviando}
                  className="btn-danger text-sm py-1.5 disabled:opacity-60"
                >
                  {enviando === 'rechazado' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Rechazar
                </button>
              </>
            )}
          </div>
          {puedeCerrar && (
            <p className="text-xs text-slate-400">
              &quot;Enviar y dejar en revisión&quot; no resuelve la solicitud: queda abierta para
              que el empleado pueda contestar.
            </p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
