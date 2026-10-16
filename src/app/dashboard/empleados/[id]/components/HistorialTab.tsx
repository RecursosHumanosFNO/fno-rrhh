import { useState } from 'react'
import { BriefcaseBusiness, Edit2, Save, X, Loader2, CheckCircle2 } from 'lucide-react'
import {
  formatFecha, formatMes, hoyAR, SOLICITUD_TIPO_LABEL, SOLICITUD_ESTADO_LABEL,
} from '@/lib/utils'
import { DESVINCULACION_MOTIVO_LABEL } from './DesactivarModal'
import type { Empleado, Solicitud, Recibo, DesvinculacionInfo, DesvinculacionMotivo } from '@/types'

// Pestaña "Historial": desvinculación vigente, bajas anteriores y actividad.
//
// La baja vigente se puede corregir. Antes era sólo lectura: se escribía una
// vez al desactivar y quedaba congelada, así que una liquidación cargada como
// "pendiente" decía pendiente para siempre, aunque ya se hubiera entregado.
export function HistorialTab({ empleado, isAdmin, misSolicitudes, misRecibos, onGuardarDesvinculacion, avisar }: {
  empleado: Empleado
  isAdmin: boolean
  misSolicitudes: Solicitud[]
  misRecibos: Recibo[]
  onGuardarDesvinculacion: (cambios: Partial<DesvinculacionInfo>) => Promise<boolean>
  avisar: (texto: string, tipo?: 'error' | 'exito' | 'info') => void
}) {
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState<DesvinculacionInfo | null>(null)

  const desv = empleado.desvinculacion

  function empezar() {
    if (!desv) return
    setForm({ ...desv })
    setEditando(true)
  }

  async function guardar(cambios: Partial<DesvinculacionInfo>) {
    setGuardando(true)
    const ok = await onGuardarDesvinculacion(cambios)
    setGuardando(false)
    if (!ok) { avisar('No se pudo guardar el cambio. Intentá de nuevo.', 'error'); return }
    setEditando(false)
    avisar('Desvinculación actualizada.', 'exito')
  }

  function guardarForm() {
    if (!form) return
    guardar({
      fecha: form.fecha,
      motivo: form.motivo,
      motivoDetalle: form.motivo === 'otro' ? form.motivoDetalle : undefined,
      telegramaEntregado: form.telegramaEntregado,
      // Sin telegrama no hay fecha de telegrama: que no quede una colgada.
      fechaTelegrama: form.telegramaEntregado ? form.fechaTelegrama : undefined,
      preaviso: form.preaviso,
      liquidacionFinal: form.liquidacionFinal,
      observaciones: form.observaciones,
    })
  }

  const etiqueta = 'text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5'

  return (
    <div className="space-y-4">
    {/* Datos de desvinculación — solo si está inactivo */}
    {empleado.estado === 'inactivo' && empleado.desvinculacion && (
      <div className="card border-l-4 border-red-400 dark:border-red-500 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <BriefcaseBusiness className="w-5 h-5 text-red-500 shrink-0" />
          <p className="section-title text-red-700 dark:text-red-400 flex-1">Registro de desvinculación</p>
          {isAdmin && !editando && (
            <div className="flex flex-wrap gap-2">
              {/* Lo que más se corrige, a un toque: no hace falta abrir el
                  formulario entero para decir que la liquidación ya se dio. */}
              {empleado.desvinculacion.liquidacionFinal === 'pendiente' && (
                <button
                  onClick={() => guardar({ liquidacionFinal: 'entregada' })}
                  disabled={guardando}
                  className="btn-success text-sm py-1.5 px-3 disabled:opacity-60"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Liquidación entregada
                </button>
              )}
              <button onClick={empezar} className="btn-secondary text-sm py-1.5 px-3">
                <Edit2 className="w-4 h-4" /> Editar
              </button>
            </div>
          )}
        </div>
        {editando && form ? (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="form-label">Fecha efectiva</label>
              <input type="date" className="form-input" value={form.fecha}
                onChange={e => setForm(f => f && ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Motivo</label>
              <select className="form-select" value={form.motivo}
                onChange={e => setForm(f => f && ({ ...f, motivo: e.target.value as DesvinculacionMotivo }))}>
                {(Object.keys(DESVINCULACION_MOTIVO_LABEL) as DesvinculacionMotivo[]).map(m => (
                  <option key={m} value={m}>{DESVINCULACION_MOTIVO_LABEL[m]}</option>
                ))}
              </select>
              {form.motivo === 'otro' && (
                <input className="form-input mt-2" placeholder="Detalle del motivo" value={form.motivoDetalle ?? ''}
                  onChange={e => setForm(f => f && ({ ...f, motivoDetalle: e.target.value }))} />
              )}
            </div>
            <div>
              <label className="form-label">Telegrama</label>
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={form.telegramaEntregado}
                  onChange={e => setForm(f => f && ({
                    ...f,
                    telegramaEntregado: e.target.checked,
                    fechaTelegrama: e.target.checked ? (f.fechaTelegrama || hoyAR()) : undefined,
                  }))} />
                <span className="text-slate-700 dark:text-slate-200">Entregado</span>
              </label>
              {form.telegramaEntregado && (
                <input type="date" className="form-input" value={form.fechaTelegrama ?? ''}
                  onChange={e => setForm(f => f && ({ ...f, fechaTelegrama: e.target.value || undefined }))} />
              )}
            </div>
            <div>
              <label className="form-label">Preaviso</label>
              <select className="form-select" value={form.preaviso}
                onChange={e => setForm(f => f && ({ ...f, preaviso: e.target.value as DesvinculacionInfo['preaviso'] }))}>
                <option value="cumplido">Cumplido</option>
                <option value="no_cumplido">No cumplido</option>
                <option value="no_aplica">No aplica</option>
              </select>
            </div>
            <div>
              <label className="form-label">Liquidación final</label>
              <select className="form-select" value={form.liquidacionFinal}
                onChange={e => setForm(f => f && ({ ...f, liquidacionFinal: e.target.value as DesvinculacionInfo['liquidacionFinal'] }))}>
                <option value="pendiente">Pendiente</option>
                <option value="entregada">Entregada</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Observaciones</label>
              <textarea className="form-input resize-y min-h-[80px]" rows={3} value={form.observaciones ?? ''}
                onChange={e => setForm(f => f && ({ ...f, observaciones: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => setEditando(false)} disabled={guardando} className="btn-secondary justify-center disabled:opacity-50">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button onClick={guardarForm} disabled={guardando || !form.fecha} className="btn-primary justify-center disabled:opacity-50">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
              </button>
            </div>
          </div>
        ) : (
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
        )}
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
