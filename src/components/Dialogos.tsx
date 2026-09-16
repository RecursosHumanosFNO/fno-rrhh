'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEscape } from '@/lib/useEscape'

// ── Avisos y confirmaciones propias ─────────────────────────────────────────
//
// Reemplazan a alert() y confirm() del navegador. Los nativos funcionaban, pero
// se ven como una página de 2005, no respetan el modo oscuro y en el celular
// anteponen "portalfno.com dice:" a cada mensaje. Además alert() congela la
// pestaña entera hasta que alguien toca Aceptar.
//
// Dos piezas distintas a propósito:
//   avisar()    → un cartel que aparece arriba (abajo en el celular), no tapa
//                 nada y se va solo. Es para contar algo que ya pasó.
//   confirmar() → una ventana modal que espera una respuesta. Devuelve una
//                 promesa, así que en el código se lee igual que el confirm()
//                 de antes, sólo que con await adelante.

type TipoAviso = 'error' | 'exito' | 'info'

interface Aviso {
  id: number
  texto: string
  tipo: TipoAviso
}

interface OpcionesConfirmar {
  titulo: string
  mensaje?: string
  confirmar?: string
  cancelar?: string
  /** 'peligro' pinta el botón de rojo: borrar, rechazar, desvincular. */
  tono?: 'peligro' | 'normal'
}

interface Api {
  avisar: (texto: string, tipo?: TipoAviso) => void
  confirmar: (opciones: OpcionesConfirmar) => Promise<boolean>
}

const Ctx = createContext<Api | null>(null)

/**
 * Da acceso a `avisar` y `confirmar` desde cualquier pantalla del dashboard.
 *
 * Si alguien lo usa fuera del proveedor preferimos fallar fuerte y no en
 * silencio: un confirmar() que devuelve siempre false borraría la mitad de un
 * flujo sin que nadie se entere.
 */
export function useDialogos(): Api {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDialogos necesita <ProveedorDialogos> más arriba en el árbol')
  return ctx
}

const DURACION_MS = 5000

const ESTILO: Record<TipoAviso, { icono: typeof Info; clase: string }> = {
  error: { icono: XCircle, clase: 'text-red-500' },
  exito: { icono: CheckCircle2, clase: 'text-emerald-500' },
  info: { icono: Info, clase: 'text-brand-600 dark:text-teal-400' },
}

export function ProveedorDialogos({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [pregunta, setPregunta] = useState<OpcionesConfirmar | null>(null)

  // La promesa de confirmar() se resuelve desde los botones, que se dibujan en
  // otro render: hay que guardar el resolve en algún lado que sobreviva.
  const responder = useRef<((v: boolean) => void) | null>(null)
  const siguienteId = useRef(0)

  const avisar = useCallback((texto: string, tipo: TipoAviso = 'error') => {
    const id = siguienteId.current++
    setAvisos(prev => [...prev, { id, texto, tipo }])
    setTimeout(() => setAvisos(prev => prev.filter(a => a.id !== id)), DURACION_MS)
  }, [])

  const confirmar = useCallback((opciones: OpcionesConfirmar) => {
    setPregunta(opciones)
    return new Promise<boolean>(resolve => { responder.current = resolve })
  }, [])

  const cerrar = useCallback((valor: boolean) => {
    setPregunta(null)
    responder.current?.(valor)
    responder.current = null
  }, [])

  // Escape cancela, igual que el clic en el fondo y que el confirm() nativo.
  useEscape(!!pregunta, () => cerrar(false))

  return (
    <Ctx.Provider value={{ avisar, confirmar }}>
      {children}

      {/* ── Avisos ────────────────────────────────────────────────────────
          En el celular van abajo: arriba quedan bajo el pulgar del encabezado
          y tapan el título de la pantalla. En pantalla grande van arriba a la
          derecha, donde no hay nada que estorbar. */}
      {avisos.length > 0 && (
        <div className="fixed z-[60] inset-x-0 bottom-0 p-4 flex flex-col gap-2 pointer-events-none
                        sm:inset-x-auto sm:bottom-auto sm:top-4 sm:right-4 sm:w-96 sm:p-0">
          {avisos.map(a => {
            const { icono: Icono, clase } = ESTILO[a.tipo]
            return (
              <div
                key={a.id}
                role="status"
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg
                           dark:border-slate-700 dark:bg-slate-900 animate-fade-in"
              >
                <Icono className={`w-5 h-5 shrink-0 mt-0.5 ${clase}`} />
                <p className="flex-1 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line break-words">
                  {a.texto}
                </p>
                <button
                  onClick={() => setAvisos(prev => prev.filter(x => x.id !== a.id))}
                  aria-label="Cerrar aviso"
                  className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Confirmación ──────────────────────────────────────────────────
          En el celular sube desde abajo y ocupa el ancho completo, que es
          donde llega el pulgar; en pantalla grande va centrada. Es el mismo
          patrón que ya usan las demás ventanas del portal. */}
      {pregunta && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => cerrar(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              pregunta.tono === 'peligro'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-sky-100 dark:bg-slate-800'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                pregunta.tono === 'peligro' ? 'text-red-500' : 'text-brand-600 dark:text-teal-400'
              }`} />
            </div>

            <h3 className="text-center font-semibold text-slate-800 dark:text-white text-lg mb-2">
              {pregunta.titulo}
            </h3>
            {pregunta.mensaje && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6 whitespace-pre-line">
                {pregunta.mensaje}
              </p>
            )}

            {/* En el celular el botón de confirmar va arriba y a lo ancho: es
                lo que se toca, y abajo del todo queda Cancelar para no
                confirmar sin querer al agarrar el teléfono. */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={() => cerrar(false)} className="btn-secondary flex-1 justify-center">
                {pregunta.cancelar ?? 'Cancelar'}
              </button>
              <button
                onClick={() => cerrar(true)}
                autoFocus
                className={`flex-1 justify-center ${pregunta.tono === 'peligro' ? 'btn-danger' : 'btn-primary'}`}
              >
                {pregunta.confirmar ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
