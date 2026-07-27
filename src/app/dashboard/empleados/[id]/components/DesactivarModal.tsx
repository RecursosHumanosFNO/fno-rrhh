import { UserX, X } from 'lucide-react'
import type { DesvinculacionMotivo } from '@/types'

export const DESVINCULACION_MOTIVO_LABEL: Record<DesvinculacionMotivo, string> = {
  renuncia_voluntaria: 'Renuncia voluntaria',
  despido_sin_causa: 'Despido sin causa',
  despido_con_causa: 'Despido con causa',
  jubilacion: 'Jubilación',
  vencimiento_contrato: 'Vencimiento de contrato',
  acuerdo_mutuo: 'Acuerdo mutuo',
  fallecimiento: 'Fallecimiento',
  otro: 'Otro',
}

export interface DesactivarForm {
  fecha: string
  motivo: DesvinculacionMotivo
  motivoDetalle: string
  telegramaEntregado: boolean
  fechaTelegrama: string
  preaviso: 'cumplido' | 'no_cumplido' | 'no_aplica'
  liquidacionFinal: 'pendiente' | 'entregada'
  observaciones: string
}

// Modal de desvinculación. El armado del DesvinculacionInfo y el guardado
// quedan en la página: acá sólo se edita el formulario.
export function DesactivarModal({ nombreCompleto, form, setForm, onClose, onConfirm }: {
  nombreCompleto: string
  form: DesactivarForm
  setForm: React.Dispatch<React.SetStateAction<DesactivarForm>>
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in rounded-t-2xl rounded-b-none sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-amber-500" />
            <p className="section-title">Desactivar a {nombreCompleto}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
            ⚠️ El empleado perderá el acceso al portal de inmediato. Podrás reactivarlo cuando quieras.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fecha de desvinculación *</label>
              <input type="date" className="form-input" value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Motivo *</label>
              <select className="form-select" value={form.motivo}
                onChange={e => setForm(f => ({ ...f, motivo: e.target.value as DesvinculacionMotivo }))}>
                {(Object.entries(DESVINCULACION_MOTIVO_LABEL) as [DesvinculacionMotivo, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          {form.motivo === 'otro' && (
            <div>
              <label className="form-label">Especificá el motivo</label>
              <input className="form-input" placeholder="Describí el motivo..." value={form.motivoDetalle}
                onChange={e => setForm(f => ({ ...f, motivoDetalle: e.target.value }))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Preaviso</label>
              <select className="form-select" value={form.preaviso}
                onChange={e => setForm(f => ({ ...f, preaviso: e.target.value as DesactivarForm['preaviso'] }))}>
                <option value="no_aplica">No aplica</option>
                <option value="cumplido">Cumplido</option>
                <option value="no_cumplido">No cumplido</option>
              </select>
            </div>
            <div>
              <label className="form-label">Liquidación final</label>
              <select className="form-select" value={form.liquidacionFinal}
                onChange={e => setForm(f => ({ ...f, liquidacionFinal: e.target.value as 'pendiente' | 'entregada' }))}>
                <option value="pendiente">Pendiente</option>
                <option value="entregada">Entregada</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.telegramaEntregado}
                onChange={e => setForm(f => ({ ...f, telegramaEntregado: e.target.checked, fechaTelegrama: e.target.checked ? f.fechaTelegrama : '' }))}
                className="w-4 h-4 accent-teal-600" />
              <span className="form-label !mb-0">Telegrama de desvinculación entregado</span>
            </label>
            {form.telegramaEntregado && (
              <div className="mt-2">
                <label className="form-label">Fecha de entrega del telegrama</label>
                <input type="date" className="form-input" value={form.fechaTelegrama}
                  onChange={e => setForm(f => ({ ...f, fechaTelegrama: e.target.value }))} />
              </div>
            )}
          </div>
          <div>
            <label className="form-label">Observaciones <span className="font-normal text-slate-400">(opcional)</span></label>
            <textarea className="form-input resize-none" rows={3} placeholder="Notas adicionales..."
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              disabled={!form.fecha || !form.motivo}
              className="btn-primary bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
              onClick={onConfirm}
            >
              <UserX className="w-4 h-4" /> Confirmar desvinculación
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
