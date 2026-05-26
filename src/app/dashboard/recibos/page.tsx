'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { formatFecha, formatMes, formatMonto } from '@/lib/utils'
import { FileText, Download, Upload, Search, X, CheckCircle2 } from 'lucide-react'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function RecibosPage() {
  const { user } = useAuth()
  const { empleados, recibos, addRecibo } = useData()
  const isAdmin = user?.role === 'admin'

  const [query, setQuery] = useState('')
  const [mesFilter, setMesFilter] = useState('')
  const [anioFilter, setAnioFilter] = useState('2026')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [uploadForm, setUploadForm] = useState({
    empleadoId: '',
    mes: new Date().getMonth() + 1,
    anio: 2026,
    monto: '',
  })

  const misRecibos = isAdmin
    ? recibos
    : recibos.filter(r => r.empleadoId === user?.empleadoId)

  const filtered = misRecibos.filter(r => {
    const emp = empleados.find(e => e.id === r.empleadoId)
    const empName = emp ? `${emp.nombre} ${emp.apellido}` : ''
    const matchQuery = !query || empName.toLowerCase().includes(query.toLowerCase()) || formatMes(r.mes, r.anio).toLowerCase().includes(query.toLowerCase())
    const matchMes = !mesFilter || r.mes === parseInt(mesFilter)
    const matchAnio = !anioFilter || r.anio === parseInt(anioFilter)
    return matchQuery && matchMes && matchAnio
  }).sort((a, b) => b.anio - a.anio || b.mes - a.mes)

  function handleSubir() {
    if (!uploadForm.empleadoId || !uploadForm.monto) return
    const emp = empleados.find(e => e.id === uploadForm.empleadoId)
    addRecibo({
      empleadoId: uploadForm.empleadoId,
      mes: uploadForm.mes,
      anio: uploadForm.anio,
      archivo: `recibo_${emp?.apellido ?? 'emp'}_${MESES[uploadForm.mes - 1].toLowerCase()}_${uploadForm.anio}.pdf`,
      fechaSubida: new Date().toISOString().slice(0, 10),
      monto: parseFloat(uploadForm.monto),
    })
    setUploadSuccess(true)
    setTimeout(() => {
      setUploadSuccess(false)
      setShowUpload(false)
      setUploadForm({ empleadoId: '', mes: new Date().getMonth() + 1, anio: 2026, monto: '' })
    }, 1500)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isAdmin ? 'Recibos de Sueldo' : 'Mis Recibos de Sueldo'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'recibo' : 'recibos'} encontrados
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Upload className="w-4 h-4" /> Subir recibo
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar empleado..."
              className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none w-full"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button onClick={() => setQuery('')}><X className="w-3.5 h-3.5 text-slate-400" /></button>}
          </div>
        )}
        <select className="form-select w-auto text-sm" value={mesFilter} onChange={e => setMesFilter(e.target.value)}>
          <option value="">Todos los meses</option>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-select w-auto text-sm" value={anioFilter} onChange={e => setAnioFilter(e.target.value)}>
          <option value="">Todos los años</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
        {(query || mesFilter || anioFilter !== '2026') && (
          <button
            onClick={() => { setQuery(''); setMesFilter(''); setAnioFilter('2026') }}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Recibos list */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron recibos</p>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin ? 'Subí recibos usando el botón "Subir recibo"' : 'Los recibos aparecerán aquí cuando RRHH los suba'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                {isAdmin && <th className="table-header text-left">Empleado</th>}
                <th className="table-header text-left">Período</th>
                <th className="table-header text-left hidden sm:table-cell">Fecha de subida</th>
                <th className="table-header text-right hidden md:table-cell">Monto</th>
                <th className="table-header text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const emp = empleados.find(e => e.id === r.empleadoId)
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {isAdmin && (
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                            {emp?.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : emp ? `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}` : '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {emp ? `${emp.nombre} ${emp.apellido}` : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-400">{emp?.sector}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatMes(r.mes, r.anio)}</p>
                          <p className="text-xs text-slate-400">{r.archivo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell hidden sm:table-cell text-slate-600 dark:text-slate-400 text-sm">
                      {formatFecha(r.fechaSubida)}
                    </td>
                    <td className="table-cell text-right hidden md:table-cell">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatMonto(r.monto)}</span>
                    </td>
                    <td className="table-cell text-right">
                      <button className="btn-secondary text-sm py-1.5 inline-flex items-center gap-1.5">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Descargar</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary cards for employee */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{misRecibos.length}</p>
            <p className="text-sm text-slate-500 mt-1">Recibos totales</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {misRecibos.filter(r => r.anio === 2026).length}
            </p>
            <p className="text-sm text-slate-500 mt-1">En 2026</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {misRecibos[0] ? formatMes(misRecibos[0].mes, misRecibos[0].anio) : 'N/A'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Último recibo</p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="card w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Subir Recibo de Sueldo</p>
              <button onClick={() => setShowUpload(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {uploadSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Recibo subido correctamente.
                </div>
              )}
              <div>
                <label className="form-label">Empleado *</label>
                <select
                  className="form-select"
                  value={uploadForm.empleadoId}
                  onChange={e => setUploadForm(f => ({ ...f, empleadoId: e.target.value }))}
                >
                  <option value="">Seleccionar empleado</option>
                  {empleados.filter(e => e.estado === 'activo').map(e => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Mes *</label>
                  <select
                    className="form-select"
                    value={uploadForm.mes}
                    onChange={e => setUploadForm(f => ({ ...f, mes: parseInt(e.target.value) }))}
                  >
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Año *</label>
                  <select
                    className="form-select"
                    value={uploadForm.anio}
                    onChange={e => setUploadForm(f => ({ ...f, anio: parseInt(e.target.value) }))}
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Monto neto (ARS) *</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="Ej: 450000"
                  value={uploadForm.monto}
                  onChange={e => setUploadForm(f => ({ ...f, monto: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Archivo PDF</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-brand-500 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Archivo PDF (referencia — se registra el monto)</p>
                  <p className="text-xs text-slate-400 mt-1">PDF hasta 5MB</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowUpload(false)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleSubir}
                  disabled={!uploadForm.empleadoId || !uploadForm.monto || uploadSuccess}
                  className="btn-primary disabled:opacity-50"
                >
                  Subir recibo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
