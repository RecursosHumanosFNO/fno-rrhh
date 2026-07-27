import { X, CheckCircle2, AlertCircle, Upload, Loader2 } from 'lucide-react'
import type { Empleado } from '@/types'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface UploadForm {
  empleadoId: string
  mes: number
  anio: number
  concepto: string
}

// Modal de carga individual de un recibo. Toda la lógica de subida vive en la
// página: acá sólo se edita el formulario y se dispara onSubir.
export function UploadReciboModal({
  empleados, meses, anioActual,
  form, setForm, status, error,
  selectedFile, fileInputRef, onFileChange,
  onClose, onSubir,
}: {
  empleados: Empleado[]
  meses: string[]
  anioActual: number
  form: UploadForm
  setForm: React.Dispatch<React.SetStateAction<UploadForm>>
  status: UploadStatus
  error: string
  selectedFile: File | null
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
  onSubir: () => void
}) {
  const subiendo = status === 'uploading'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="section-title">Subir Recibo de Sueldo</p>
          <button onClick={() => { if (!subiendo) onClose() }}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {status === 'success' && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Recibo registrado correctamente.
            </div>
          )}
          {error && status !== 'success' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          <div>
            <label className="form-label">Empleado *</label>
            <select className="form-select" value={form.empleadoId} onChange={e => setForm(f => ({ ...f, empleadoId: e.target.value }))} disabled={subiendo}>
              <option value="">Seleccionar empleado</option>
              {empleados.filter(e => e.estado === 'activo').sort((a, b) => a.apellido.localeCompare(b.apellido)).map(e => (
                <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Mes *</label>
              <select className="form-select" value={form.mes} onChange={e => setForm(f => ({ ...f, mes: parseInt(e.target.value) }))} disabled={subiendo}>
                {meses.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Año *</label>
              <select className="form-select" value={form.anio} onChange={e => setForm(f => ({ ...f, anio: parseInt(e.target.value) }))} disabled={subiendo}>
                {[anioActual, anioActual - 1, anioActual - 2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Concepto *</label>
            <input
              className="form-input"
              placeholder="Ej: Recibo mensual, SAC, Liquidación..."
              value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
              disabled={subiendo}
              list="concepto-options"
            />
            <datalist id="concepto-options">
              <option value="Recibo mensual" />
              <option value="Sueldo Anual Complementario" />
              <option value="Liquidación final" />
              <option value="Adelanto de sueldo" />
            </datalist>
          </div>
          <div>
            <label className="form-label">Archivo PDF <span className="text-slate-400 font-normal ml-1">(guardado cifrado en la nube)</span></label>
            <div
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${selectedFile ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={onFileChange} disabled={subiendo} />
              {selectedFile ? (
                <div><CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" /><p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{selectedFile.name}</p><p className="text-xs text-slate-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Hacé clic para cambiar</p></div>
              ) : (
                <div><Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" /><p className="text-sm text-slate-500">Hacé clic para seleccionar un PDF</p><p className="text-xs text-slate-400 mt-1">Máx. 10 MB</p></div>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="btn-secondary" disabled={subiendo}>Cancelar</button>
            <button onClick={onSubir} disabled={!form.empleadoId || subiendo || status === 'success'} className="btn-primary disabled:opacity-50">
              {subiendo ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4" /> Subir recibo</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
