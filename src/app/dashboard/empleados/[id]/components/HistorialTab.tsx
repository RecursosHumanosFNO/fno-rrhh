import { BriefcaseBusiness } from 'lucide-react'
import {
  formatFecha, formatMes, SOLICITUD_TIPO_LABEL, SOLICITUD_ESTADO_LABEL,
} from '@/lib/utils'
import { DESVINCULACION_MOTIVO_LABEL } from './DesactivarModal'
import type { Empleado, Solicitud, Recibo } from '@/types'

// Pestaña "Historial": desvinculación vigente, bajas anteriores y actividad.
// Es puramente presentacional — no toca estado ni hace fetch.
export function HistorialTab({ empleado, isAdmin, misSolicitudes, misRecibos }: {
  empleado: Empleado
  isAdmin: boolean
  misSolicitudes: Solicitud[]
  misRecibos: Recibo[]
}) {
  return (
    <div className="space-y-4">
    {/* Datos de desvinculación — solo si está inactivo */}
    {empleado.estado === 'inactivo' && empleado.desvinculacion && (
      <div className="card border-l-4 border-red-400 dark:border-red-500 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <BriefcaseBusiness className="w-5 h-5 text-red-500 shrink-0" />
          <p className="section-title text-red-700 dark:text-red-400">Registro de desvinculación</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Fecha efectiva</p>
            <p className="text-slate-700 dark:text-slate-200 font-medium">{formatFecha(empleado.desvinculacion.fecha)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Motivo</p>
            <p className="text-slate-700 dark:text-slate-200 font-medium">
              {DESVINCULACION_MOTIVO_LABEL[empleado.desvinculacion.motivo]}
              {empleado.desvinculacion.motivoDetalle && ` — ${empleado.desvinculacion.motivoDetalle}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Telegrama</p>
            <p className={`font-medium ${empleado.desvinculacion.telegramaEntregado ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {empleado.desvinculacion.telegramaEntregado
                ? `Entregado${empleado.desvinculacion.fechaTelegrama ? ` el ${formatFecha(empleado.desvinculacion.fechaTelegrama)}` : ''}`
                : 'No entregado'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Preaviso</p>
            <p className="text-slate-700 dark:text-slate-200 font-medium capitalize">
              {empleado.desvinculacion.preaviso === 'cumplido' ? '✅ Cumplido'
                : empleado.desvinculacion.preaviso === 'no_cumplido' ? '❌ No cumplido'
                : '— No aplica'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Liquidación final</p>
            <p className={`font-medium ${empleado.desvinculacion.liquidacionFinal === 'entregada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {empleado.desvinculacion.liquidacionFinal === 'entregada' ? '✅ Entregada' : '⏳ Pendiente'}
            </p>
          </div>
          {empleado.desvinculacion.registradoPor && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Registrado por</p>
              <p className="text-slate-700 dark:text-slate-200">{empleado.desvinculacion.registradoPor} · {formatFecha(empleado.desvinculacion.fechaRegistro)}</p>
            </div>
          )}
          {empleado.desvinculacion.observaciones && (
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Observaciones</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{empleado.desvinculacion.observaciones}</p>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Historial de desvinculaciones anteriores — solo admin, preservadas al reactivar */}
    {isAdmin && empleado.historialDesvinculaciones && empleado.historialDesvinculaciones.length > 0 && (
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <BriefcaseBusiness className="w-4 h-4 text-slate-400 shrink-0" />
          <p className="section-title">Bajas anteriores ({empleado.historialDesvinculaciones.length})</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...empleado.historialDesvinculaciones].reverse().map((baja, i) => (
            <div key={i} className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Fecha</p>
                <p className="text-slate-700 dark:text-slate-200">{formatFecha(baja.fecha)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Motivo</p>
                <p className="text-slate-700 dark:text-slate-200">
                  {DESVINCULACION_MOTIVO_LABEL[baja.motivo]}
                  {baja.motivoDetalle ? ` — ${baja.motivoDetalle}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Liquidación</p>
                <p className={baja.liquidacionFinal === 'entregada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>
                  {baja.liquidacionFinal === 'entregada' ? '✅ Entregada' : '⏳ Pendiente'}
                </p>
              </div>
              {baja.observaciones && (
                <div className="sm:col-span-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Observaciones</p>
                  <p className="text-slate-500 dark:text-slate-400 italic">{baja.observaciones}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="card p-5">
      <p className="section-title mb-4">Historial de Actividad</p>
      {misSolicitudes.length === 0 && misRecibos.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">Sin actividad registrada aún.</p>
      ) : (
        <div className="space-y-4">
          {[
            ...misRecibos.slice(0, 3).map(r => ({
              fecha: r.fechaSubida,
              desc: `Recibo de ${formatMes(r.mes, r.anio)} disponible`,
            })),
            ...misSolicitudes.slice(0, 4).map(s => ({
              fecha: s.fechaCreacion,
              desc: `Solicitud de ${SOLICITUD_TIPO_LABEL[s.tipo]}: ${SOLICITUD_ESTADO_LABEL[s.estado]}`,
            })),
          ].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-700 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{item.desc}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatFecha(item.fecha)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  )
}
