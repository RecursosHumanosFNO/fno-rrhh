'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { formatFecha, formatMes, formatMonto } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  FileText, Download, Upload, Search, X, CheckCircle2,
  Loader2, AlertCircle, Eye, Cloud, HardDrive, Lock,
  Layers, ChevronRight, AlertTriangle, CheckCheck, User, Trash2,
} from 'lucide-react'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ── Tipos para carga masiva ────────────────────────────────────────────────
type BulkRow = {
  file: File
  detectedDni: string
  empleadoId: string      // '' = sin asignar
  monto: string
  status: 'matched' | 'unmatched' | 'manual'
  selected: boolean       // si se incluye en el envío
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error'
  errorMsg?: string
}
type BulkStep = 'select' | 'preview' | 'uploading' | 'done'

// ── Helpers de matching ────────────────────────────────────────────────────
function normDni(d: string) { return d.replace(/\D/g, '') }

function extractDniFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  // Busca secuencia de 7 u 8 dígitos en el nombre (DNI argentino)
  const m = base.match(/\b(\d{7,8})\b/)
  return m ? m[1] : ''
}

function extractMontoFromFilename(name: string, dniFound: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  const parts = base.split(/[_\-\s]+/)
  for (const p of parts) {
    if (/^\d{4,10}$/.test(p) && p !== dniFound) return p
  }
  return ''
}

export default function RecibosPage() {
  const { user } = useAuth()
  const { empleados, recibos, addRecibo, deleteRecibo, addNotification } = useData()
  const isAdmin = user?.role === 'admin'

  // ── Estado filtros/tabla ───────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [mesFilter, setMesFilter] = useState('')
  const [anioFilter, setAnioFilter] = useState('2026')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; archivoUrl?: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteRecibo() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      // Borrar el PDF del Storage (si tiene)
      if (confirmDelete.archivoUrl && supabase) {
        await supabase.storage.from('fno-recibos').remove([confirmDelete.archivoUrl]).catch(() => {})
      }
      deleteRecibo(confirmDelete.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  // ── Estado carga individual ────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ANIO_ACTUAL = new Date().getFullYear()
  const [uploadForm, setUploadForm] = useState({
    empleadoId: '',
    mes: new Date().getMonth() + 1,
    anio: ANIO_ACTUAL,
    monto: '',
    concepto: 'Recibo mensual',
  })

  // ── Estado carga masiva ────────────────────────────────────────────────
  const [showBulk, setShowBulk] = useState(false)
  const [bulkStep, setBulkStep] = useState<BulkStep>('select')
  const [bulkMes, setBulkMes] = useState(new Date().getMonth() + 1)
  const [bulkAnio, setBulkAnio] = useState(new Date().getFullYear())
  const [bulkConcepto, setBulkConcepto] = useState('Recibo mensual')
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkConfirmed, setBulkConfirmed] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkDone, setBulkDone] = useState({ ok: 0, fail: 0 })
  const bulkInputRef = useRef<HTMLInputElement>(null)

  // ── Listado filtrado ───────────────────────────────────────────────────
  const misRecibos = isAdmin ? recibos : recibos.filter(r => r.empleadoId === user?.empleadoId)

  const filtered = useMemo(() => misRecibos.filter(r => {
    const emp = empleados.find(e => e.id === r.empleadoId)
    const empName = emp ? `${emp.nombre} ${emp.apellido}` : ''
    const matchQuery = !query || empName.toLowerCase().includes(query.toLowerCase()) || formatMes(r.mes, r.anio).toLowerCase().includes(query.toLowerCase())
    const matchMes = !mesFilter || r.mes === parseInt(mesFilter)
    const matchAnio = !anioFilter || r.anio === parseInt(anioFilter)
    return matchQuery && matchMes && matchAnio
  }).sort((a, b) => b.anio - a.anio || b.mes - a.mes), [misRecibos, empleados, query, mesFilter, anioFilter])

  // ── Carga individual ───────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') { setUploadError('Solo se aceptan archivos PDF.'); return }
    if (f.size > 10 * 1024 * 1024) { setUploadError('El archivo no puede superar los 10 MB.'); return }
    setUploadError('')
    setSelectedFile(f)
  }

  async function handleSubir() {
    if (!uploadForm.empleadoId || !uploadForm.monto) return
    setUploadStatus('uploading')
    setUploadError('')
    const emp = empleados.find(e => e.id === uploadForm.empleadoId)
    const fileName = `recibo_${emp?.apellido?.toLowerCase() ?? 'emp'}_${MESES[uploadForm.mes - 1].toLowerCase()}_${uploadForm.anio}.pdf`
    let storagePath: string | undefined

    if (selectedFile) {
      const sb = supabase // cliente autenticado (sesión del admin) — necesario para el bucket privado
      if (sb) {
        const path = `${uploadForm.empleadoId}/${uploadForm.anio}/${uploadForm.mes.toString().padStart(2, '0')}_${Date.now()}.pdf`
        const { error: upErr } = await sb.storage.from('fno-recibos').upload(path, selectedFile, { contentType: 'application/pdf', upsert: false })
        if (upErr) {
          setUploadError(`Advertencia: No se pudo subir el archivo (${upErr.message}). El recibo se registrará sin PDF.`)
        } else {
          storagePath = path
        }
      }
    }

    addRecibo({
      empleadoId: uploadForm.empleadoId,
      mes: uploadForm.mes,
      anio: uploadForm.anio,
      archivo: fileName,
      fechaSubida: new Date().toISOString().slice(0, 10),
      monto: parseFloat(uploadForm.monto),
      archivoUrl: storagePath,
      concepto: uploadForm.concepto,
    })

    // Confirmación para el admin
    addNotification({
      texto: `${uploadForm.concepto} cargado: ${emp ? `${emp.nombre} ${emp.apellido}` : 'empleado'} — ${MESES[uploadForm.mes - 1]} ${uploadForm.anio}`,
      tipo: 'recibo', soloAdmin: true,
    })

    setUploadStatus('success')
    if (storagePath) setUploadError('')
    setTimeout(() => {
      setUploadStatus('idle'); setShowUpload(false); setSelectedFile(null); setUploadError('')
      setUploadForm({ empleadoId: '', mes: new Date().getMonth() + 1, anio: ANIO_ACTUAL, monto: '', concepto: 'Recibo mensual' })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }, 1800)
  }

  // ── Carga masiva — analizar archivos ──────────────────────────────────
  const analizarArchivos = useCallback((files: File[]) => {
    const rows: BulkRow[] = files
      .filter(f => f.type === 'application/pdf')
      .map(file => {
        const dni = extractDniFromFilename(file.name)
        const monto = extractMontoFromFilename(file.name, dni)
        const empActivos = empleados.filter(e => e.estado === 'activo' && e.id !== '1')
        const match = dni
          ? empActivos.find(e => normDni(e.dni ?? '') === normDni(dni))
          : undefined
        return {
          file,
          detectedDni: dni,
          empleadoId: match?.id ?? '',
          monto,
          status: match ? 'matched' : 'unmatched' as BulkRow['status'],
          selected: !!match, // los que matchean vienen tildados por defecto
          uploadStatus: 'pending',
        } as BulkRow
      })
    setBulkRows(rows)
    setBulkStep('preview')
  }, [empleados])

  function handleBulkFileDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    analizarArchivos(files)
  }

  function handleBulkFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    analizarArchivos(files)
  }

  // ── Carga masiva — subir todos ─────────────────────────────────────────
  async function handleBulkUpload() {
    if (!bulkConfirmed) return
    const rowsToUpload = bulkRows.filter(r => r.empleadoId && r.selected)
    setBulkStep('uploading')
    setBulkProgress(0)
    const sb = supabase // cliente autenticado (sesión del admin)
    let ok = 0, fail = 0

    for (let i = 0; i < rowsToUpload.length; i++) {
      const row = rowsToUpload[i]
      // Marcar fila como "subiendo"
      setBulkRows(prev => prev.map(r => r.file.name === row.file.name ? { ...r, uploadStatus: 'uploading' } : r))

      try {
        let storagePath: string | undefined
        if (sb) {
          const path = `${row.empleadoId}/${bulkAnio}/${bulkMes.toString().padStart(2, '0')}_${Date.now()}_${i}.pdf`
          const { error } = await sb.storage.from('fno-recibos').upload(path, row.file, {
            contentType: 'application/pdf', upsert: false,
          })
          if (!error) storagePath = path
          else console.warn('[bulk] storage error:', error.message)
        }

        const emp = empleados.find(e => e.id === row.empleadoId)
        addRecibo({
          empleadoId: row.empleadoId,
          mes: bulkMes,
          anio: bulkAnio,
          archivo: `recibo_${emp?.apellido?.toLowerCase() ?? 'emp'}_${MESES[bulkMes - 1].toLowerCase()}_${bulkAnio}.pdf`,
          fechaSubida: new Date().toISOString().slice(0, 10),
          monto: parseFloat(row.monto) || 0,
          archivoUrl: storagePath,
          concepto: bulkConcepto,
        })

        setBulkRows(prev => prev.map(r => r.file.name === row.file.name ? { ...r, uploadStatus: 'done' } : r))
        ok++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        setBulkRows(prev => prev.map(r => r.file.name === row.file.name ? { ...r, uploadStatus: 'error', errorMsg: msg } : r))
        fail++
      }
      setBulkProgress(Math.round(((i + 1) / rowsToUpload.length) * 100))
    }

    setBulkDone({ ok, fail })
    setBulkStep('done')

    // Confirmación resumen para el admin
    if (ok > 0) {
      addNotification({
        texto: `Carga masiva: ${ok} recibo${ok !== 1 ? 's' : ''} cargado${ok !== 1 ? 's' : ''} — ${MESES[bulkMes - 1]} ${bulkAnio}${fail > 0 ? ` (${fail} con error)` : ''}`,
        tipo: 'recibo', soloAdmin: true,
      })
    }
  }

  function resetBulk() {
    setShowBulk(false)
    setBulkStep('select')
    setBulkRows([])
    setBulkConfirmed(false)
    setBulkProgress(0)
    setBulkDone({ ok: 0, fail: 0 })
    if (bulkInputRef.current) bulkInputRef.current.value = ''
  }

  // ── Descargar recibo ───────────────────────────────────────────────────
  async function handleDescargar(r: { id: string; archivo: string; archivoUrl?: string; empleadoId: string }) {
    if (!r.archivoUrl) {
      alert(`El recibo "${r.archivo}" no tiene PDF adjunto.\n\nPedile a RRHH que lo vuelva a cargar.`)
      return
    }
    setDownloadingId(r.id)
    try {
      const res = await fetch('/api/recibo-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: r.archivoUrl, empleadoId: user?.empleadoId ?? '' }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) { alert('No se pudo obtener el link del recibo.'); return }
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Error de conexión.')
    } finally {
      setDownloadingId(null)
    }
  }

  const sinAsignar = bulkRows.filter(r => !r.empleadoId).length
  const conAsignar = bulkRows.filter(r => r.empleadoId).length
  const aEnviar = bulkRows.filter(r => r.empleadoId && r.selected).length

  // Agrupar filas por sector del empleado asignado (para el preview)
  const gruposPorSector = (() => {
    const map = new Map<string, number[]>()
    bulkRows.forEach((r, i) => {
      const emp = empleados.find(e => e.id === r.empleadoId)
      const sector = emp?.sector || '⚠ Sin asignar'
      if (!map.has(sector)) map.set(sector, [])
      map.get(sector)!.push(i)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  })()

  function toggleRow(i: number) {
    setBulkRows(prev => prev.map((r, j) => j === i ? { ...r, selected: !r.selected } : r))
  }
  function setSectorSelected(indices: number[], value: boolean) {
    setBulkRows(prev => prev.map((r, j) => indices.includes(j) && r.empleadoId ? { ...r, selected: value } : r))
  }

  // ──────────────────────────────────────────────────────────────────────
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
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg">
            <Lock className="w-3.5 h-3.5" /> Acceso privado
          </div>
          {isAdmin && (
            <>
              <button
                onClick={() => { setShowBulk(true); setBulkStep('select') }}
                className="btn-secondary"
              >
                <Layers className="w-4 h-4" /> Carga masiva
              </button>
              <button
                onClick={() => { setShowUpload(true); setUploadStatus('idle'); setUploadError('') }}
                className="btn-primary"
              >
                <Upload className="w-4 h-4" /> Subir recibo
              </button>
            </>
          )}
        </div>
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
        <select aria-label="Filtrar por mes" className="form-select w-auto text-sm" value={mesFilter} onChange={e => setMesFilter(e.target.value)}>
          <option value="">Todos los meses</option>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select aria-label="Filtrar por año" className="form-select w-auto text-sm" value={anioFilter} onChange={e => setAnioFilter(e.target.value)}>
          <option value="">Todos los años</option>
          {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(query || mesFilter || anioFilter !== '2026') && (
          <button onClick={() => { setQuery(''); setMesFilter(''); setAnioFilter('2026') }} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
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
            {isAdmin ? 'Subí recibos usando los botones de arriba' : 'Los recibos aparecerán aquí cuando RRHH los suba'}
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
                const tieneArchivo = !!r.archivoUrl
                const isDownloading = downloadingId === r.id
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {isAdmin && (
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                            {emp?.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : emp ? `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}` : '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emp ? `${emp.nombre} ${emp.apellido}` : 'N/A'}</p>
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
                          {r.concepto && (
                            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${
                              r.concepto === 'Sueldo Anual Complementario'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {r.concepto === 'Sueldo Anual Complementario' ? '🎁 Aguinaldo (SAC)' : '📅 Recibo mensual'}
                            </span>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            {tieneArchivo
                              ? <><Cloud className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-600 dark:text-emerald-400">PDF en la nube</span></>
                              : <><HardDrive className="w-3 h-3 text-slate-400" /><span className="text-xs text-slate-400">Sin archivo</span></>
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell hidden sm:table-cell text-slate-600 dark:text-slate-400 text-sm">{formatFecha(r.fechaSubida)}</td>
                    <td className="table-cell text-right hidden md:table-cell">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatMonto(r.monto)}</span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleDescargar(r)}
                          disabled={!tieneArchivo || isDownloading}
                          className={`inline-flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg transition-colors ${
                            tieneArchivo
                              ? 'bg-brand-700 hover:bg-brand-600 text-white disabled:opacity-70'
                              : 'border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : tieneArchivo ? <Eye className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          <span className="hidden sm:inline">{isDownloading ? 'Cargando...' : tieneArchivo ? 'Ver PDF' : 'Sin archivo'}</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmDelete({ id: r.id, archivoUrl: r.archivoUrl, label: `${emp ? `${emp.nombre} ${emp.apellido}` : 'empleado'} — ${formatMes(r.mes, r.anio)}` })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Eliminar recibo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal confirmar eliminación de recibo */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!deleting) setConfirmDelete(null) }}>
          <div className="card w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Eliminar recibo?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {confirmDelete.label}. Se borrará el registro y el PDF. No se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="btn-secondary flex-1 justify-center disabled:opacity-50">Cancelar</button>
                <button onClick={handleDeleteRecibo} disabled={deleting}
                  className="flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards resumen empleado */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{misRecibos.length}</p>
            <p className="text-sm text-slate-500 mt-1">Recibos totales</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{misRecibos.filter(r => r.anio === ANIO_ACTUAL).length}</p>
            <p className="text-sm text-slate-500 mt-1">En {ANIO_ACTUAL}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {misRecibos[0] ? formatMes(misRecibos[0].mes, misRecibos[0].anio) : 'N/A'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Último recibo</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CARGA INDIVIDUAL
      ══════════════════════════════════════════════════════════════ */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (uploadStatus !== 'uploading') setShowUpload(false) }}>
          <div className="card w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Subir Recibo de Sueldo</p>
              <button onClick={() => { if (uploadStatus !== 'uploading') setShowUpload(false) }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {uploadStatus === 'success' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Recibo registrado correctamente.
                </div>
              )}
              {uploadError && uploadStatus !== 'success' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{uploadError}</span>
                </div>
              )}
              <div>
                <label className="form-label">Empleado *</label>
                <select className="form-select" value={uploadForm.empleadoId} onChange={e => setUploadForm(f => ({ ...f, empleadoId: e.target.value }))} disabled={uploadStatus === 'uploading'}>
                  <option value="">Seleccionar empleado</option>
                  {empleados.filter(e => e.estado === 'activo' && e.id !== '1').sort((a, b) => a.apellido.localeCompare(b.apellido)).map(e => (
                    <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Mes *</label>
                  <select className="form-select" value={uploadForm.mes} onChange={e => setUploadForm(f => ({ ...f, mes: parseInt(e.target.value) }))} disabled={uploadStatus === 'uploading'}>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Año *</label>
                  <select className="form-select" value={uploadForm.anio} onChange={e => setUploadForm(f => ({ ...f, anio: parseInt(e.target.value) }))} disabled={uploadStatus === 'uploading'}>
                    {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Concepto *</label>
                <select className="form-select" value={uploadForm.concepto} onChange={e => setUploadForm(f => ({ ...f, concepto: e.target.value }))} disabled={uploadStatus === 'uploading'}>
                  <option>Recibo mensual</option>
                  <option>Sueldo Anual Complementario</option>
                </select>
              </div>
              <div>
                <label className="form-label">Monto neto (ARS) *</label>
                <input className="form-input" type="number" placeholder="Ej: 450000" value={uploadForm.monto} onChange={e => setUploadForm(f => ({ ...f, monto: e.target.value }))} disabled={uploadStatus === 'uploading'} />
              </div>
              <div>
                <label className="form-label">Archivo PDF <span className="text-slate-400 font-normal ml-1">(guardado cifrado en la nube)</span></label>
                <div
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${selectedFile ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={uploadStatus === 'uploading'} />
                  {selectedFile ? (
                    <div><CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" /><p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{selectedFile.name}</p><p className="text-xs text-slate-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Hacé clic para cambiar</p></div>
                  ) : (
                    <div><Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" /><p className="text-sm text-slate-500">Hacé clic para seleccionar un PDF</p><p className="text-xs text-slate-400 mt-1">Máx. 10 MB</p></div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowUpload(false)} className="btn-secondary" disabled={uploadStatus === 'uploading'}>Cancelar</button>
                <button onClick={handleSubir} disabled={!uploadForm.empleadoId || !uploadForm.monto || uploadStatus === 'uploading' || uploadStatus === 'success'} className="btn-primary disabled:opacity-50">
                  {uploadStatus === 'uploading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4" /> Subir recibo</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CARGA MASIVA
      ══════════════════════════════════════════════════════════════ */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { if (bulkStep !== 'uploading') resetBulk() }}>
          <div className="card w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <p className="section-title flex items-center gap-2"><Layers className="w-5 h-5" /> Carga masiva de recibos</p>
                <p className="text-xs text-slate-400 mt-0.5">Los archivos deben tener el DNI del empleado en el nombre (ej: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">20123456.pdf</code>)</p>
              </div>
              {bulkStep !== 'uploading' && (
                <button onClick={resetBulk}><X className="w-5 h-5 text-slate-400" /></button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">

              {/* PASO 1: Seleccionar archivos */}
              {bulkStep === 'select' && (
                <div className="p-5 space-y-5">
                  {/* Instrucciones */}
                  <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-sm text-sky-800 dark:text-sky-300 space-y-1.5">
                    <p className="font-semibold">¿Cómo nombrar los archivos?</p>
                    <div className="space-y-1 text-xs text-sky-700 dark:text-sky-400">
                      <p>✅ <code className="bg-sky-100 dark:bg-sky-900/40 px-1 rounded">20123456.pdf</code> → solo el DNI (7 u 8 dígitos)</p>
                      <p>✅ <code className="bg-sky-100 dark:bg-sky-900/40 px-1 rounded">20123456_450000.pdf</code> → DNI + monto (opcional)</p>
                      <p>✅ <code className="bg-sky-100 dark:bg-sky-900/40 px-1 rounded">GARCIA_20123456.pdf</code> → también se detecta el DNI</p>
                      <p className="text-amber-600 dark:text-amber-400">⚠ Un archivo sin DNI reconocible quedará sin asignar y no se subirá hasta que lo asignes manualmente.</p>
                    </div>
                  </div>

                  {/* Período */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Mes del período *</label>
                      <select className="form-select" value={bulkMes} onChange={e => setBulkMes(parseInt(e.target.value))}>
                        {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Año *</label>
                      <select className="form-select" value={bulkAnio} onChange={e => setBulkAnio(parseInt(e.target.value))}>
                        {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Concepto * <span className="text-slate-400 font-normal">(aplica a todos)</span></label>
                    <select className="form-select" value={bulkConcepto} onChange={e => setBulkConcepto(e.target.value)}>
                      <option>Recibo mensual</option>
                      <option>Sueldo Anual Complementario</option>
                    </select>
                  </div>

                  {/* Drop zone */}
                  <div
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/50 dark:hover:border-teal-500 dark:hover:bg-teal-900/10 transition-all"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleBulkFileDrop}
                    onClick={() => bulkInputRef.current?.click()}
                  >
                    <input ref={bulkInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handleBulkFileSelect} />
                    <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Arrastrá los PDFs aquí o hacé clic para seleccionarlos</p>
                    <p className="text-slate-400 text-sm mt-1">Podés seleccionar todos los archivos del mes de una vez</p>
                  </div>
                </div>
              )}

              {/* PASO 2: Preview / revisión */}
              {bulkStep === 'preview' && (
                <div className="p-5 space-y-4">
                  {/* Resumen de estado */}
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm px-3 py-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" /> {bulkRows.filter(r => r.empleadoId).length} asignados
                    </div>
                    {sinAsignar > 0 && (
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4" /> {sinAsignar} sin asignar
                      </div>
                    )}
                    <div className="ml-auto text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      Período: <span className="font-semibold text-slate-700 dark:text-slate-200">{MESES[bulkMes - 1]} {bulkAnio}</span>
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
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Monto (ARS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {gruposPorSector.map(([sector, indices]) => {
                          const asignablesIdx = indices.filter(i => bulkRows[i].empleadoId)
                          const todosSel = asignablesIdx.length > 0 && asignablesIdx.every(i => bulkRows[i].selected)
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
                          const row = bulkRows[i]
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
                                    onChange={e => setBulkRows(prev => prev.map((r, j) => j === i ? { ...r, empleadoId: e.target.value, status: 'manual' } : r))}
                                  >
                                    <option value="">⚠ Seleccionar empleado...</option>
                                    {empleados.filter(e => e.estado === 'activo' && e.id !== '1').sort((a, b) => a.apellido.localeCompare(b.apellido)).map(e => (
                                      <option key={e.id} value={e.id}>{e.apellido}, {e.nombre} — {normDni(e.dni ?? '')}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-brand-700 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                                      {emp?.foto ? <img src={emp.foto} alt="" className="w-6 h-6 object-cover" /> : <User className="w-3.5 h-3.5" />}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{emp ? `${emp.apellido}, ${emp.nombre}` : '—'}</p>
                                      <p className="text-[10px] text-slate-400">{emp?.sector}</p>
                                    </div>
                                    <button
                                      onClick={() => setBulkRows(prev => prev.map((r, j) => j === i ? { ...r, empleadoId: '', status: 'unmatched' } : r))}
                                      className="ml-auto text-slate-300 hover:text-red-400 transition-colors"
                                      title="Cambiar asignación"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              {/* Monto */}
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={row.monto}
                                  onChange={e => setBulkRows(prev => prev.map((r, j) => j === i ? { ...r, monto: e.target.value } : r))}
                                  className="form-input text-xs py-1.5 w-28"
                                />
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
                        checked={bulkConfirmed}
                        onChange={e => setBulkConfirmed(e.target.checked)}
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
              {bulkStep === 'uploading' && (
                <div className="p-8 space-y-6">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-brand-600 dark:text-teal-400 animate-spin mx-auto mb-3" />
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Subiendo recibos...</p>
                    <p className="text-sm text-slate-500 mt-1">{bulkProgress}% completado</p>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div className="bg-brand-700 dark:bg-teal-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${bulkProgress}%` }} />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bulkRows.filter(r => r.empleadoId && r.selected).map((row, i) => {
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
              {bulkStep === 'done' && (
                <div className="p-8 text-center space-y-4">
                  {bulkDone.fail === 0 ? (
                    <CheckCheck className="w-14 h-14 text-emerald-500 mx-auto" />
                  ) : (
                    <AlertCircle className="w-14 h-14 text-amber-500 mx-auto" />
                  )}
                  <div>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {bulkDone.fail === 0 ? '¡Carga completada!' : 'Carga finalizada con errores'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      {bulkDone.ok} recibos subidos correctamente
                      {bulkDone.fail > 0 && ` · ${bulkDone.fail} con error`}
                    </p>
                  </div>
                  {bulkDone.fail > 0 && (
                    <div className="space-y-1.5 text-left">
                      {bulkRows.filter(r => r.uploadStatus === 'error').map((r, i) => {
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
              {bulkStep === 'select' && (
                <button onClick={resetBulk} className="btn-secondary">Cancelar</button>
              )}
              {bulkStep === 'preview' && (
                <>
                  <button
                    onClick={() => { setBulkStep('select'); setBulkRows([]); setBulkConfirmed(false) }}
                    className="btn-secondary"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={!bulkConfirmed || aEnviar === 0}
                    className="btn-primary disabled:opacity-50"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Confirmar y subir {aEnviar} recibo{aEnviar !== 1 ? 's' : ''}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
              {bulkStep === 'done' && (
                <button onClick={resetBulk} className="btn-primary mx-auto">
                  <CheckCircle2 className="w-4 h-4" /> Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
