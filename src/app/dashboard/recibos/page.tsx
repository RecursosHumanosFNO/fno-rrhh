'use client'

import Link from 'next/link'
import React, { useState, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { formatFecha, formatMes, hoyAR } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/authFetch'
import * as XLSX from 'xlsx'
import {
  FileText, Download, Upload, Search, X, CheckCircle2,
  Loader2, AlertCircle, Eye, Cloud, HardDrive, Lock,
  Layers, ChevronRight, AlertTriangle, CheckCheck, User, Trash2,
  PenLine, ShieldCheck, ClipboardList, Plus, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { MESES, normDni, extractDniFromFilename, type BulkRow, type BulkStep } from './lib'
import { UploadReciboModal } from './components/UploadReciboModal'
import { BulkUploadModal } from './components/BulkUploadModal'





export default function RecibosPage() {
  const { user } = useAuth()
  const { empleados, recibos, addRecibo, deleteRecibo, addNotification, firmas, firmarRecibo } = useData()
  const isAdmin = user?.role === 'admin'
  const [adminTab, setAdminTab] = useState<'todos' | 'mis'>('todos')
  // viewAsAdmin: controla el modo de visualización (admin con tab "mis" ve la vista de empleado)
  const viewAsAdmin = isAdmin && adminTab === 'todos'

  // ── Estado filtros/tabla ───────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [mesFilter, setMesFilter] = useState('')
  const [anioFilter, setAnioFilter] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; archivoUrl?: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [firmaModal, setFirmaModal] = useState<{ id: string; label: string } | null>(null)
  const [firmaAcepto, setFirmaAcepto] = useState(false)
  const [firmando, setFirmando] = useState(false)
  const [showAuditoria, setShowAuditoria] = useState(false)
  const [auditQuery, setAuditQuery] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  function exportarAuditoria() {
    const hoy = hoyAR()
    const rows = firmas
      .map(f => {
        const emp = empleados.find(e => e.id === f.empleadoId)
        const rec = recibos.find(r => r.id === f.reciboId)
        const fechaArg = new Date(f.firmadoEn).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
        return {
          'Apellido': emp?.apellido ?? '',
          'Nombre': emp?.nombre ?? '',
          'DNI': emp?.dni ?? '',
          'Email': emp?.email ?? '',
          'Sector': emp?.sector ?? '',
          'Período': rec ? formatMes(rec.mes, rec.anio) : '',
          'Mes': rec?.mes ?? '',
          'Año': rec?.anio ?? '',
          'Firmado el (Argentina)': fechaArg,
          'Firma ID': f.id,
        }
      })
      .sort((a, b) => a['Apellido'].localeCompare(b['Apellido'], 'es'))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 30 },
      { wch: 20 }, { wch: 16 }, { wch: 6 }, { wch: 6 },
      { wch: 26 }, { wch: 36 },
    ]
    ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Firmas de Recibos')
    XLSX.writeFile(wb, `auditoria_firmas_${hoy}.xlsx`)
  }

  async function exportarAuditoriaPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const BRAND: [number,number,number] = [10,110,130]
    const DARK: [number,number,number] = [30,41,59]
    const GRAY: [number,number,number] = [100,116,139]
    const LIGHT: [number,number,number] = [241,245,249]

    // Header
    doc.setFillColor(...BRAND); doc.rect(0, 0, 210, 36, 'F')
    doc.setTextColor(255,255,255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('Fundación Neuquén Oeste', 14, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('Portal de Recursos Humanos · Auditoría de Firmas Electrónicas', 14, 26)

    let y = 46
    doc.setTextColor(...DARK); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('AUDITORÍA DE FIRMAS DE RECIBOS', 14, y); y += 7
    const now = new Date().toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
    doc.text(`Generado el ${now} · Total de firmas: ${firmas.length}`, 14, y); y += 10

    // Legal notice box
    doc.setFillColor(...LIGHT); doc.roundedRect(14, y, 182, 18, 2, 2, 'F')
    doc.setTextColor(...GRAY); doc.setFontSize(8); doc.setFont('helvetica', 'italic')
    doc.text('Las firmas electrónicas registradas en este documento tienen validez legal conforme a la Ley 25.506 de Firma Digital de la República Argentina.', 20, y + 6, { maxWidth: 170 })
    doc.text('Cada firma incluye identificación del firmante, fecha y hora exacta (zona horaria Argentina/Buenos_Aires) y un identificador único de trazabilidad.', 20, y + 12, { maxWidth: 170 })
    y += 25

    // Table headers
    const COL = [14, 52, 76, 96, 122, 148]
    const HEADERS = ['Empleado', 'DNI', 'Sector', 'Período', 'Firmado (Argentina)', 'ID Firma']
    const WIDTHS = [38, 24, 20, 26, 26, 42]
    doc.setFillColor(...BRAND); doc.rect(14, y, 182, 7, 'F')
    doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    HEADERS.forEach((h, i) => doc.text(h, COL[i] + 1, y + 4.8))
    y += 7

    const sorted = [...firmas].sort((a,b) => {
      const ea = empleados.find(e => e.id === a.empleadoId)
      const eb = empleados.find(e => e.id === b.empleadoId)
      return (ea?.apellido ?? '').localeCompare(eb?.apellido ?? '', 'es')
    })

    let rowBg = false
    for (const f of sorted) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      const emp = empleados.find(e => e.id === f.empleadoId)
      const rec = recibos.find(r => r.id === f.reciboId)
      const fecha = new Date(f.firmadoEn).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
      const vals = [
        emp ? `${emp.apellido}, ${emp.nombre}` : '—',
        emp?.dni ?? '—',
        emp?.sector ?? '—',
        rec ? formatMes(rec.mes, rec.anio) : '—',
        fecha,
        f.id.slice(0, 8) + '...',
      ]
      if (rowBg) { doc.setFillColor(248,250,252); doc.rect(14, y, 182, 7, 'F') }
      doc.setTextColor(...DARK); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
      vals.forEach((v, i) => {
        const txt = doc.splitTextToSize(v, WIDTHS[i] - 2)
        doc.text(txt[0], COL[i] + 1, y + 4.8)
      })
      y += 7; rowBg = !rowBg
    }

    // Footer
    doc.setFillColor(...LIGHT); doc.rect(0, 282, 210, 15, 'F')
    doc.setTextColor(...GRAY); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    doc.text(`Generado el ${now} · Portal RRHH · Fundación Neuquén Oeste · Documento de auditoría interna`, 14, 291)

    const hoy = hoyAR()
    doc.save(`auditoria_firmas_${hoy}.pdf`)
  }

  async function handleFirmar() {
    if (!firmaModal || !firmaAcepto || !user?.empleadoId) return
    setFirmando(true)
    const ok = await firmarRecibo(firmaModal.id, user.empleadoId)
    if (ok) {
      // Superponer firma visual en el PDF (no bloquea — si falla el audit trail ya quedó)
      if (supabase) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          authFetch('/api/recibo-firmar-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reciboId: firmaModal.id, empleadoId: user.empleadoId, authId: authUser.id }),
          }).catch(() => {})
        }
      }
      setFirmaModal(null)
      setFirmaAcepto(false)
    }
    setFirmando(false)
  }

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
  const bulkAddInputRef = useRef<HTMLInputElement>(null)

  // ── Listado filtrado ───────────────────────────────────────────────────
  const misRecibos = viewAsAdmin ? recibos : recibos.filter(r => r.empleadoId === user?.empleadoId)

  const filtered = useMemo(() => misRecibos.filter(r => {
    const emp = empleados.find(e => e.id === r.empleadoId)
    const empName = emp ? `${emp.nombre} ${emp.apellido}` : ''
    const matchQuery = !query || empName.toLowerCase().includes(query.toLowerCase()) || formatMes(r.mes, r.anio).toLowerCase().includes(query.toLowerCase())
    const matchMes = !mesFilter || r.mes === parseInt(mesFilter)
    const matchAnio = !anioFilter || r.anio === parseInt(anioFilter)
    return matchQuery && matchMes && matchAnio
  }).sort((a, b) => {
    const da = a.fechaSubida ?? ''
    const db = b.fechaSubida ?? ''
    return sortDir === 'desc' ? db.localeCompare(da) : da.localeCompare(db)
  }), [misRecibos, empleados, query, mesFilter, anioFilter, sortDir])

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
    if (!uploadForm.empleadoId) return
    if (!selectedFile) { setUploadError('El PDF es obligatorio para registrar un recibo.'); return }
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
      fechaSubida: hoyAR(),
      monto: 0,
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
      setUploadForm({ empleadoId: '', mes: new Date().getMonth() + 1, anio: ANIO_ACTUAL, concepto: 'Recibo mensual' })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }, 1800)
  }

  // ── Carga masiva — analizar archivos ──────────────────────────────────
  const analizarArchivos = useCallback((files: File[]) => {
    const rows: BulkRow[] = files
      .filter(f => f.type === 'application/pdf')
      .map(file => {
        const dni = extractDniFromFilename(file.name)
        const empActivos = empleados.filter(e => e.estado === 'activo')
        const match = dni
          ? empActivos.find(e => normDni(e.dni ?? '') === normDni(dni))
          : undefined
        return {
          file,
          detectedDni: dni,
          empleadoId: match?.id ?? '',
          status: match ? 'matched' : 'unmatched' as BulkRow['status'],
          selected: !!match,
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

  // Agrega más archivos a la lista existente (sin reemplazar)
  function handleAgregarMas(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.type === 'application/pdf')
    if (!files.length) return
    const existingNames = new Set(bulkRows.map(r => r.file.name))
    const newFiles = files.filter(f => !existingNames.has(f.name))
    if (!newFiles.length) return
    const empActivos = empleados.filter(e => e.estado === 'activo')
    const newRows: BulkRow[] = newFiles.map(file => {
      const dni = extractDniFromFilename(file.name)
      const match = dni ? empActivos.find(e => normDni(e.dni ?? '') === normDni(dni)) : undefined
      return { file, detectedDni: dni, empleadoId: match?.id ?? '',
        status: match ? 'matched' : 'unmatched' as BulkRow['status'],
        selected: !!match, uploadStatus: 'pending' } as BulkRow
    })
    setBulkRows(prev => [...prev, ...newRows])
    if (bulkAddInputRef.current) bulkAddInputRef.current.value = ''
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
        if (!sb) throw new Error('Supabase no configurado — el archivo no se puede almacenar.')
        const path = `${row.empleadoId}/${bulkAnio}/${bulkMes.toString().padStart(2, '0')}_${Date.now()}_${i}.pdf`
        const { error: upErr } = await sb.storage.from('fno-recibos').upload(path, row.file, {
          contentType: 'application/pdf', upsert: false,
        })
        // Si el upload falla no creamos el recibo — error explícito en la fila
        if (upErr) throw new Error(upErr.message)
        const storagePath = path

        const emp = empleados.find(e => e.id === row.empleadoId)
        addRecibo({
          empleadoId: row.empleadoId,
          mes: bulkMes,
          anio: bulkAnio,
          archivo: `recibo_${emp?.apellido?.toLowerCase() ?? 'emp'}_${MESES[bulkMes - 1].toLowerCase()}_${bulkAnio}.pdf`,
          fechaSubida: hoyAR(),
          monto: 0,
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
      const res = await authFetch('/api/recibo-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: r.archivoUrl, empleadoId: user?.empleadoId ?? '' }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) { alert('No se pudo obtener el link del recibo.'); return }
      // Abre en nueva pestaña: el visor nativo del browser tiene zoom, descargar e imprimir integrados
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Error de conexión.')
    } finally {
      setDownloadingId(null)
    }
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
          {viewAsAdmin && (
            <>
              <button
                onClick={() => setShowAuditoria(v => !v)}
                className={`btn-secondary ${showAuditoria ? 'ring-2 ring-brand-400' : ''}`}
              >
                <ClipboardList className="w-4 h-4" /> Auditoría
                {firmas.length > 0 && (
                  <span className="ml-1 bg-brand-700 text-white text-xs px-1.5 py-0.5 rounded-full">{firmas.length}</span>
                )}
              </button>
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

      {/* Tabs admin/empleado — solo si el usuario es admin */}
      {isAdmin && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setAdminTab('todos')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              adminTab === 'todos'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Todos los recibos
          </button>
          <button
            onClick={() => setAdminTab('mis')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              adminTab === 'mis'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Mis recibos
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {viewAsAdmin && (
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
        {(query || mesFilter || anioFilter) && (
          <button onClick={() => { setQuery(''); setMesFilter(''); setAnioFilter('') }} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* ── Panel de auditoría de firmas (solo admin) ─────────────────────── */}
      {viewAsAdmin && showAuditoria && (() => {
        const firmasFiltradas = firmas.filter(f => {
          if (!auditQuery) return true
          const emp = empleados.find(e => e.id === f.empleadoId)
          const rec = recibos.find(r => r.id === f.reciboId)
          const texto = `${emp?.nombre} ${emp?.apellido} ${emp?.dni} ${rec ? formatMes(rec.mes, rec.anio) : ''}`.toLowerCase()
          return texto.includes(auditQuery.toLowerCase())
        })
        return (
          <div className="card overflow-hidden border-2 border-brand-200 dark:border-brand-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-50/50 dark:bg-brand-900/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-700 dark:text-brand-400" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Registro de firmas electrónicas</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{firmas.length} firma{firmas.length !== 1 ? 's' : ''} registrada{firmas.length !== 1 ? 's' : ''} · Ley 25.506</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar empleado, DNI, período..."
                    className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none w-44"
                    value={auditQuery}
                    onChange={e => setAuditQuery(e.target.value)}
                  />
                  {auditQuery && <button onClick={() => setAuditQuery('')}><X className="w-3.5 h-3.5 text-slate-400" /></button>}
                </div>
                <button onClick={exportarAuditoria} className="btn-secondary text-sm" title="Exportar a Excel">
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button onClick={exportarAuditoriaPDF} className="btn-secondary text-sm" title="Exportar PDF legal">
                  <FileText className="w-4 h-4" /> PDF Legal
                </button>
              </div>
            </div>

            {firmasFiltradas.length === 0 ? (
              <div className="p-10 text-center">
                <ShieldCheck className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">{firmas.length === 0 ? 'Aún no hay recibos firmados' : 'Sin resultados para la búsqueda'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                      <th className="table-header text-left">Empleado</th>
                      <th className="table-header text-left">DNI</th>
                      <th className="table-header text-left">Período firmado</th>
                      <th className="table-header text-left">Fecha y hora (Argentina)</th>
                      <th className="table-header text-left hidden lg:table-cell">ID de firma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {firmasFiltradas
                      .slice()
                      .sort((a, b) => b.firmadoEn.localeCompare(a.firmadoEn))
                      .map(f => {
                        const emp = empleados.find(e => e.id === f.empleadoId)
                        const rec = recibos.find(r => r.id === f.reciboId)
                        const fechaArg = new Date(f.firmadoEn).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'medium' })
                        return (
                          <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                                  {emp?.foto ? <img src={emp.foto} alt="" className="w-7 h-7 object-cover" /> : emp ? `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}` : '?'}
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{emp ? `${emp.apellido}, ${emp.nombre}` : f.empleadoId}</span>
                              </div>
                            </td>
                            <td className="table-cell font-mono text-slate-600 dark:text-slate-400 text-xs">{emp?.dni ?? '—'}</td>
                            <td className="table-cell">
                              <span className="font-medium text-slate-700 dark:text-slate-200">{rec ? formatMes(rec.mes, rec.anio) : '—'}</span>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="text-slate-700 dark:text-slate-300">{fechaArg}</span>
                              </div>
                            </td>
                            <td className="table-cell hidden lg:table-cell">
                              <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{f.id}</span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {/* Recibos list */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron recibos</p>
          <p className="text-slate-400 text-sm mt-1">
            {viewAsAdmin ? 'Subí recibos usando los botones de arriba' : 'Los recibos aparecerán aquí cuando RRHH los suba'}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr>
                {viewAsAdmin && <th className="table-header text-left">Empleado</th>}
                <th className="table-header text-left">Período</th>
                <th className="table-header text-left hidden sm:table-cell">
                  <button
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center gap-1.5 hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
                    title={sortDir === 'desc' ? 'Ordenar: más antiguos primero' : 'Ordenar: más recientes primero'}
                  >
                    Fecha de subida
                    {sortDir === 'desc'
                      ? <ArrowDown className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      : <ArrowUp className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    }
                  </button>
                </th>
                <th className="table-header text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const emp = empleados.find(e => e.id === r.empleadoId)
                const tieneArchivo = !!r.archivoUrl
                const isDownloading = downloadingId === r.id
                const firma = firmas.find(f => f.reciboId === r.id)
                const esMio = r.empleadoId === user?.empleadoId
                return (
                  <tr key={r.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${firma ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : ''}`}>
                    {viewAsAdmin && (
                      <td className="table-cell max-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <Link href={emp ? `/dashboard/empleados/${emp.id}` : '#'} className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden ring-0 hover:ring-2 hover:ring-brand-400 hover:scale-110 transition-all duration-200">
                            {emp?.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : emp ? `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}` : '?'}
                          </Link>
                          <div className="min-w-0">
                            <Link href={emp ? `/dashboard/empleados/${emp.id}` : '#'} className="text-sm font-medium text-slate-700 dark:text-slate-200 relative inline-block font-medium text-slate-700 dark:text-slate-200 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 hover:after:w-full after:bg-brand-600 dark:after:bg-brand-400 after:transition-all after:duration-200 truncate">{emp ? `${emp.apellido}, ${emp.nombre}` : 'N/A'}</Link>
                            <p className="text-xs text-slate-400 truncate">{emp?.sector}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-brand-700 dark:text-brand-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatMes(r.mes, r.anio)}</p>
                          {r.concepto && (
                            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap ${
                              r.concepto === 'Sueldo Anual Complementario'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {r.concepto === 'Sueldo Anual Complementario' ? '🎁 Aguinaldo (SAC)' : '📅 Recibo mensual'}
                            </span>
                          )}
                          <div className="flex items-center gap-1 mt-0.5 whitespace-nowrap">
                            {tieneArchivo
                              ? <><Cloud className="w-3 h-3 text-emerald-500 shrink-0" /><span className="text-xs text-emerald-600 dark:text-emerald-400">PDF en la nube</span></>
                              : <><HardDrive className="w-3 h-3 text-slate-400 shrink-0" /><span className="text-xs text-slate-400">Sin archivo</span></>
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell hidden sm:table-cell text-slate-600 dark:text-slate-400 text-sm">{formatFecha(r.fechaSubida)}</td>
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
                        {/* Firma: empleado puede firmar, admin en tab "mis" también */}
                        {!viewAsAdmin && esMio && (
                          firma ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg" title={`Firmado el ${new Date(firma.firmadoEn).toLocaleString('es-AR')}`}>
                              <ShieldCheck className="w-3.5 h-3.5" /> Firmado
                            </span>
                          ) : (
                            <button
                              onClick={() => { setFirmaModal({ id: r.id, label: formatMes(r.mes, r.anio) }); setFirmaAcepto(false) }}
                              className="inline-flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                            >
                              <PenLine className="w-4 h-4" /> Firmar
                            </button>
                          )
                        )}
                        {viewAsAdmin && (
                          <>
                            {firma ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg" title={`Firmado el ${new Date(firma.firmadoEn).toLocaleString('es-AR')}`}>
                                <ShieldCheck className="w-3.5 h-3.5" /> Firmado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                Sin firmar
                              </span>
                            )}
                            <button
                              onClick={() => setConfirmDelete({ id: r.id, archivoUrl: r.archivoUrl, label: `${emp ? `${emp.nombre} ${emp.apellido}` : 'empleado'} — ${formatMes(r.mes, r.anio)}` })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Eliminar recibo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Modal firma de recibo */}
      {firmaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!firmando) { setFirmaModal(null); setFirmaAcepto(false) } }}>
          <div className="card w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <PenLine className="w-7 h-7 text-brand-700 dark:text-brand-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 text-center mb-1">
                Firmar recibo de {firmaModal.label}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                Al firmar, confirmás haber recibido y leído tu recibo de sueldo correspondiente a <strong>{firmaModal.label}</strong>.
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-400 mb-5 space-y-1 border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Esta firma electrónica implica que:</p>
                <p>✅ Recibiste el recibo de sueldo indicado</p>
                <p>✅ Pudiste acceder a su contenido</p>
                <p>✅ Se registrará tu nombre, fecha y hora exacta</p>
                <p className="text-slate-400 mt-2">De acuerdo con la Ley 25.506 de Firma Digital de Argentina.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer bg-brand-50 dark:bg-brand-900/20 rounded-xl px-4 py-3 border border-brand-200 dark:border-brand-800 mb-5">
                <input
                  type="checkbox"
                  checked={firmaAcepto}
                  onChange={e => setFirmaAcepto(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-brand-700 cursor-pointer"
                  disabled={firmando}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>Confirmo</strong> haber recibido y podido acceder al recibo de sueldo de <strong>{firmaModal.label}</strong>.
                </span>
              </label>

              <div className="flex gap-3">
                <button onClick={() => { setFirmaModal(null); setFirmaAcepto(false) }} disabled={firmando} className="btn-secondary flex-1 justify-center disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleFirmar} disabled={!firmaAcepto || firmando} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {firmando
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Firmando...</>
                    : <><ShieldCheck className="w-4 h-4" /> Firmar recibo</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación de recibo */}
      {confirmDelete && (() => {
        const hasFirma = firmas.some(f => f.reciboId === confirmDelete.id)
        return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!deleting) setConfirmDelete(null) }}>
          <div className="card w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Eliminar recibo?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                {confirmDelete.label}. Se borrará el registro y el PDF. No se puede deshacer.
              </p>
              {hasFirma && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 flex items-start gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Atención:</strong> Este recibo ya fue firmado electrónicamente por el empleado. Eliminarlo borrará también el registro de firma del audito.
                  </p>
                </div>
              )}
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
        )
      })()}

      {/* Cards resumen empleado */}
      {!viewAsAdmin && (
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
        <UploadReciboModal
          empleados={empleados}
          meses={MESES}
          anioActual={ANIO_ACTUAL}
          form={uploadForm}
          setForm={setUploadForm}
          status={uploadStatus}
          error={uploadError}
          selectedFile={selectedFile}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onClose={() => setShowUpload(false)}
          onSubir={handleSubir}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CARGA MASIVA
      ══════════════════════════════════════════════════════════════ */}
      {showBulk && (
        <BulkUploadModal
          empleados={empleados}
          recibos={recibos}
          meses={MESES}
          anioActual={ANIO_ACTUAL}
          step={bulkStep} setStep={setBulkStep}
          mes={bulkMes} setMes={setBulkMes}
          anio={bulkAnio} setAnio={setBulkAnio}
          concepto={bulkConcepto} setConcepto={setBulkConcepto}
          rows={bulkRows} setRows={setBulkRows}
          confirmed={bulkConfirmed} setConfirmed={setBulkConfirmed}
          progress={bulkProgress}
          done={bulkDone}
          inputRef={bulkInputRef}
          addInputRef={bulkAddInputRef}
          onFileSelect={handleBulkFileSelect}
          onFileDrop={handleBulkFileDrop}
          onAgregarMas={handleAgregarMas}
          onUpload={handleBulkUpload}
          onReset={resetBulk}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  )
}
