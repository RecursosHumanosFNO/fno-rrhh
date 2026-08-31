import { Send, CheckCircle2, Hourglass, XCircle, Clock } from 'lucide-react'
import { formatFecha } from '@/lib/utils'

// ── Línea de tiempo del estado de una solicitud ──────────────────────────────
export function SolicitudTimeline({ sol }: { sol: { estado: string; fechaCreacion: string; fechaResolucion?: string } }) {
  const resuelto = sol.estado === 'aprobado' || sol.estado === 'rechazado'
  const enRevision = sol.estado === 'en_revision'
  const aprobado = sol.estado === 'aprobado'
  const rechazado = sol.estado === 'rechazado'

  const steps = [
    {
      label: 'Solicitud enviada',
      fecha: sol.fechaCreacion,
      icon: Send,
      state: 'done' as const,
      color: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40',
      line: 'bg-brand-300 dark:bg-brand-700',
    },
    {
      label: resuelto ? 'Revisada por RRHH' : 'En revisión por RRHH',
      fecha: resuelto ? sol.fechaResolucion : undefined,
      sub: resuelto
        ? undefined
        : enRevision
          ? 'RRHH pidió más información — respondé en la conversación'
          : 'Esperando respuesta del administrador',
      icon: resuelto ? CheckCircle2 : Hourglass,
      state: resuelto ? ('done' as const) : ('active' as const),
      color: resuelto
        ? 'text-brand-600 bg-brand-100 dark:bg-brand-900/40'
        : 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 animate-pulse',
      line: resuelto ? 'bg-brand-300 dark:bg-brand-700' : 'bg-slate-200 dark:bg-slate-700',
    },
    {
      label: aprobado ? 'Solicitud aprobada' : rechazado ? 'Solicitud rechazada' : 'Resolución',
      fecha: resuelto ? sol.fechaResolucion : undefined,
      icon: aprobado ? CheckCircle2 : rechazado ? XCircle : Clock,
      state: resuelto ? ('done' as const) : ('pending' as const),
      color: aprobado
        ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40'
        : rechazado
          ? 'text-red-600 bg-red-100 dark:bg-red-900/40'
          : 'text-slate-400 bg-slate-100 dark:bg-slate-800',
      line: '',
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Seguimiento</p>
      <div className="space-y-0">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isLast = i === steps.length - 1
          return (
            <div key={i} className="flex gap-3">
              {/* Columna del ícono + línea */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {!isLast && <div className={`w-0.5 flex-1 min-h-[20px] my-1 ${step.line || 'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
              {/* Contenido */}
              <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm font-medium ${
                  step.state === 'pending' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {step.label}
                </p>
                {step.fecha && (
                  <p className="text-xs text-slate-400 mt-0.5">{formatFecha(step.fecha)}</p>
                )}
                {step.sub && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{step.sub}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
