import React from 'react'
import {
  X, CheckCircle2, AlertCircle, Upload, Loader2, FileText, Trash2, Plus,
  Layers, AlertTriangle, ChevronRight, CheckCheck, User, Cloud,
} from 'lucide-react'
import type { Empleado, Recibo } from '@/types'
import { normDni, type BulkRow, type BulkStep } from '../lib'

// Modal de carga masiva de recibos (seleccionar → previsualizar → subir).
// El estado y los handlers viven en la página: acá sólo se renderiza y se
// notifica hacia arriba.
export function BulkUploadModal({
  empleados, recibos, meses, anioActual,
  step, setStep,
  mes, setMes, anio, setAnio, concepto, setConcepto,
  rows, setRows, confirmed, setConfirmed,
  progress, done,
  inputRef, addInputRef,
  onFileSelect, onFileDrop, onAgregarMas, onUpload, onReset, onClose,
}: {
  empleados: Empleado[]
  recibos: Recibo[]
  meses: string[]
  anioActual: number
  step: BulkStep
  setStep: React.Dispatch<React.SetStateAction<BulkStep>>
  mes: number
  setMes: React.Dispatch<React.SetStateAction<number>>
  anio: number
  setAnio: React.Dispatch<React.SetStateAction<number>>
  concepto: string
  setConcepto: React.Dispatch<React.SetStateAction<string>>
  rows: BulkRow[]
  setRows: React.Dispatch<React.SetStateAction<BulkRow[]>>
  confirmed: boolean
  setConfirmed: React.Dispatch<React.SetStateAction<boolean>>
  progress: number
  done: { ok: number; fail: number }
  inputRef: React.RefObject<HTMLInputElement>
  addInputRef: React.RefObject<HTMLInputElement>
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onAgregarMas: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
  onReset: () => void
  onClose: () => void
}) {
  const sinAsignar = rows.filter(r => !r.empleadoId).length
  const conAsignar = rows.filter(r => r.empleadoId).length
  const aEnviar = rows.filter(r => r.empleadoId && r.selected).length

  // Agrupar filas por sector del empleado asignado (para el preview)
  const gruposPorSector = (() => {
    const map = new Map<string, number[]>()
    rows.forEach((r, i) => {
      const emp = empleados.find(e => e.id === r.empleadoId)
      const sector = emp?.sector || '⚠ Sin asignar'
      if (!map.has(sector)) map.set(sector, [])
      map.get(sector)!.push(i)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  })()

  function toggleRow(i: number) {
    setRows(prev => prev.map((r, j) => j === i ? { ...r, selected: !r.selected } : r))
  }
  function setSectorSelected(indices: number[], value: boolean) {
    setRows(prev => prev.map((r, j) => indices.includes(j) && r.empleadoId ? { ...r, selected: value } : r))
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <p className="section-title flex items-center gap-2"><Layers className="w-5 h-5" /> Carga masiva de recibos</p>
            <p className="text-xs text-slate-400 mt-0.5">Los archivos deben tener el DNI del empleado en el nombre (ej: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">20123456.pdf</code>)</p>
          </div>
          {step !== 'uploading' && (
            <button onClick={onReset}><X className="w-5 h-5 text-slate-400" /></button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">

          {/* PASO 1: Seleccionar archivos */}
          {step === 'select' && (
            <div className="p-5 space-y-5">
              {/* Instrucciones */}
              <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-sm text-sky-800 dark:text-sky-300 space-y-1.5">
                <p className="font-semibold">¿Cómo nombrar los archivos?</p>
                <div className="space-y-1 text-xs text-sky-700 dark:text-sky-400">
                  <p>✅ <code className="bg-sky-100 dark:bg-sky-900/40 px-1 rounded">20123456.pdf</code> → solo el DNI (7 u 8 dígitos)</p>
                  <p>✅ <code className="bg-sky-100 dark:bg-sky-900/40 px-1 rounded">GARCIA_20123456.pdf</code> → también se detecta el DNI</p>
                  <p className="text-amber-600 dark:text-amber-400">⚠ Un archivo sin DNI reconocible quedará sin asignar y no se subirá hasta que lo asignes manualmente.</p>
                </div>
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Mes del período *</label>
                  <select className="form-select" value={mes} onChange={e => setMes(parseInt(e.target.value))}>
                    {meses.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Año *</label>
                  <select className="form-select" value={anio} onChange={e => setAnio(parseInt(e.target.value))}>
                    {[anioActual, anioActual - 1, anioActual - 2].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Concepto * <span className="text-slate-400 font-normal">(aplica a todos)</span></label>
                <select className="form-select" value={concepto} onChange={e => setConcepto(e.target.value)}>
                  <option>Recibo mensual</option>
                  <option>Sueldo Anual Complementario</option>
                </select>
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/50 dark:hover:border-teal-500 dark:hover:bg-teal-900/10 transition-all"
                onDragOver={e => e.preventDefault()}
                onDrop={onFileDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={onFileSelect} />
                <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Arrastrá los PDFs aquí o hacé clic para seleccionarlos</p>
                <p className="text-slate-400 text-sm mt-1">Podés seleccionar todos los archivos del mes de una vez</p>
              </div>
            </div>
          )}

          {/* PASO 2: Preview / revisión */}
          {step === 'preview' && (
            <div className="p-5 space-y-4">
              {/* Resumen de estado */}
              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm px-3 py-2 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> {rows.filter(r => r.empleadoId).length} asignados
                </div>
                {sinAsignar > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4" /> {sinAsignar} sin asignar
                  </div>
                )}
                {/* Agregar más archivos */}
                <button
                  onClick={() => addInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar más
                </button>
                <input
                  ref={addInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={onAgregarMas}
                />
                <div className="ml-auto text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Período: <span className="font-semibold text-slate-700 dark:text-slate-200">{meses[mes - 1]} {anio}</span>
                </div>
              </div>

              {/* Tabla de revisión — agrupada por sector, con selección */}
              <div className="rounded-xl overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                      <th className="px-3 py-3 w-10"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Archivo PDF (DNI)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">DNI detectado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Empleado asignado</th>
                      <th className="px-3 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {gruposPorSector.map(([sector, indices]) => {
                      const asignablesIdx = indices.filter(i => rows[i].empleadoId)
                      const todosSel = asignablesIdx.length > 0 && asignablesIdx.every(i => rows[i].selected)
                      return (
                        <React.Fragment key={sector}>
                          {/* Encabezado de sector */}
                          <tr className="bg-slate-100/80 dark:bg-slate-800">
                            <td className="px-3 py-2">
                              {asignablesIdx.length > 0 && (
                                <input type="checkbox" checked={todosSel}
                                  onChange={e => setSectorSelected(indices, e.target.checked)}
                                  className="w-4 h-4 accent-teal-600 cursor-pointer" title="Seleccionar todo el sector" />
                              )}
                            </td>
                            <td colSpan={4} className="px-4 py-2">
                              <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{sector}</span>
                              <span className="text-xs text-slate-400 ml-2">({indices.length})</span>
                            </td>
                          </tr>
                    {indices.map(i => {
                      const row = rows[i]
                      const emp = empleados.find(e => e.id === row.empleadoId)
                      const sinEmp = !row.empleadoId
                      return (
                        <tr key={i} className={`${sinEmp ? 'bg-red-50/60 dark:bg-red-900/10' : row.selected ? '' : 'opacity-50'}`}>
                          {/* Check de selección */}
                          <td className="px-3 py-3">
                            <input type="checkbox" checked={row.selected} disabled={sinEmp}
                              onChange={() => toggleRow(i)}
                              className="w-4 h-4 accent-teal-600 cursor-pointer disabled:opacity-40" />
                          </td>
                          {/* Archivo */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className={`w-4 h-4 shrink-0 ${sinEmp ? 'text-red-400' : 'text-brand-600 dark:text-teal-400'}`} />
                              <span className={`text-xs truncate max-w-[160px] ${sinEmp ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`} title={row.file.name}>
                                {row.file.name}
                              </span>
                            </div>
                          </td>
                          {/* DNI detectado */}
                          <td className="px-4 py-3">
                            {row.detectedDni
                              ? <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{row.detectedDni}</span>
                              : <span className="text-xs text-red-500">No detectado</span>
                            }
                          </td>
                          {/* Empleado asignado */}
                          <td className="px-4 py-3 min-w-[200px]">
                            {sinEmp ? (
                              <select
                                className="form-select text-xs py-1.5"
                                value=""
                                onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, empleadoId: e.target.value, status: 'manual' } : r))}
                              >
                                <option value="">⚠ Seleccionar empleado...</option>
                                {empleados.filter(e => e.estado === 'activo').sort((a, b) => a.apellido.localeCompare(b.apellido)).map(e => (
                                  <option key={e.id} value={e.id}>{e.apellido}, {e.nombre} — {normDni(e.dni ?? '')}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-brand-700 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                                  {emp?.foto ? <img loading="lazy" width={24} height={24} src={emp.foto} alt="" className="w-6 h-6 object-cover" /> : <User className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{emp ? `${emp.apellido}, ${emp.nombre}` : '—'}</p>
                                  <p className="text-[10px] text-slate-400">{emp?.sector}</p>
                                </div>
                                <button
                                  onClick={() => setRows(prev => prev.map((r, j) => j === i ? { ...r, empleadoId: '', status: 'unmatched' } : r))}
                                  className="ml-auto text-slate-300 hover:text-red-400 transition-colors"
                                  title="Cambiar asignación"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          {/* Quitar fila */}
                          <td className="px-3 py-3">
                            <button
                              onClick={() => setRows(prev => prev.filter((_, j) => j !== i))}
                              title="Quitar archivo"
                              className="text-slate-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Advertencia si hay sin asignar */}
              {sinAsignar > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><strong>{sinAsignar} archivo{sinAsignar > 1 ? 's' : ''}</strong> no {sinAsignar > 1 ? 'tienen' : 'tiene'} empleado asignado. Asigná manualmente desde el dropdown rojo o eliminá esos archivos de la carga. No se subirán hasta que estén asignados.</span>
                </div>
              )}

              {/* Confirmación */}
              {conAsignar > 0 && (
                <label className="flex items-start gap-3 cursor-pointer bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-teal-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>Verifico que cada recibo corresponde exactamente al empleado asignado.</strong>
                    {' '}Un recibo mal asignado comprometería información salarial privada.
                  </span>
                </label>
              )}
            </div>
          )}

          {/* PASO 3: Subiendo */}
          {step === 'uploading' && (
            <div className="p-8 space-y-6">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-brand-600 dark:text-teal-400 animate-spin mx-auto mb-3" />
                <p className="font-semibold text-slate-800 dark:text-slate-100">Subiendo recibos...</p>
                <p className="text-sm text-slate-500 mt-1">{progress}% completado</p>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className="bg-brand-700 dark:bg-teal-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rows.filter(r => r.empleadoId && r.selected).map((row, i) => {
                  const emp = empleados.find(e => e.id === row.empleadoId)
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      {row.uploadStatus === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
                      {row.uploadStatus === 'uploading' && <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />}
                      {row.uploadStatus === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {row.uploadStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      <span className={`flex-1 truncate ${row.uploadStatus === 'error' ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}`}>
                        {emp ? `${emp.apellido}, ${emp.nombre}` : row.file.name}
                      </span>
                      {row.uploadStatus === 'error' && <span className="text-xs text-red-500">{row.errorMsg}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* PASO 4: Listo */}
          {step === 'done' && (
            <div className="p-8 text-center space-y-4">
              {done.fail === 0 ? (
                <CheckCheck className="w-14 h-14 text-emerald-500 mx-auto" />
              ) : (
                <AlertCircle className="w-14 h-14 text-amber-500 mx-auto" />
              )}
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {done.fail === 0 ? '¡Carga completada!' : 'Carga finalizada con errores'}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  {done.ok} recibos subidos correctamente
                  {done.fail > 0 && ` · ${done.fail} con error`}
                </p>
              </div>
              {done.fail > 0 && (
                <div className="space-y-1.5 text-left">
                  {rows.filter(r => r.uploadStatus === 'error').map((r, i) => {
                    const emp = empleados.find(e => e.id === r.empleadoId)
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {emp ? `${emp.apellido}, ${emp.nombre}` : r.file.name}: {r.errorMsg}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {step === 'select' && (
            <button onClick={onReset} className="btn-secondary">Cancelar</button>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('select'); setRows([]); setConfirmed(false) }}
                className="btn-secondary"
              >
                ← Volver
              </button>
              <button
                onClick={onUpload}
                disabled={!confirmed || aEnviar === 0}
                className="btn-primary disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                Confirmar y subir {aEnviar} recibo{aEnviar !== 1 ? 's' : ''}
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onReset} className="btn-primary mx-auto">
              <CheckCircle2 className="w-4 h-4" /> Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
