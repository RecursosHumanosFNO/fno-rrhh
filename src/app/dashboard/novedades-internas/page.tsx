'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import {
  REGISTRO_NOVEDAD_CATEGORIA_LABEL,
  REGISTRO_NOVEDAD_CATEGORIAS,
  REGISTRO_NOVEDAD_CATEGORIA_COLOR,
  formatFecha,
} from '@/lib/utils'
import type { RegistroNovedad, RegistroNovedadCategoria, Empleado } from '@/types'
import {
  Plus, Search, Trash2, Pencil, X, Upload, Image as ImageIcon,
  User, Calendar, Clock, FileText, Tag, Building2, Briefcase,
  AlertTriangle, CheckCircle2, Loader2, Download, FileSpreadsheet,
} from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type HoraTipo = 'sin_hora' | 'exacta' | 'rango'
type ModoEmpleado = 'lista' | 'manual'

interface FormState {
  modoEmpleado: ModoEmpleado
  empleadoId: string
  empleadoNombre: string
  sector: string
  cargo: string
  fecha: string
  horaTipo: HoraTipo
  hora: string
  horaDesde: string
  horaHasta: string
  descripcion: string
  categoria: RegistroNovedadCategoria | ''
  edificio: string
  fotoUrl: string
}

const emptyForm: FormState = {
  modoEmpleado: 'lista',
  empleadoId: '',
  empleadoNombre: '',
  sector: '',
  cargo: '',
  fecha: new Date().toISOString().slice(0, 10),
  horaTipo: 'sin_hora',
  hora: '',
  horaDesde: '',
  horaHasta: '',
  descripcion: '',
  categoria: '',
  edificio: '',
  fotoUrl: '',
}

function sendEmail(type: string, data: Record<string, string>) {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => {})
}

function horaLabel(r: RegistroNovedad): string | null {
  if (r.horaTipo === 'exacta' && r.hora) return `A las ${r.hora} hs`
  if (r.horaTipo === 'rango' && r.horaDesde) return `${r.horaDesde} — ${r.horaHasta} hs`
  return null
}

function enrichRow(r: RegistroNovedad, empleados: Empleado[]) {
  const emp = r.empleadoId ? empleados.find(e => e.id === r.empleadoId) : null
  return {
    nombre: r.empleadoNombre,
    dni: emp?.dni ?? '',
    cuil: emp?.cuil ?? '',
    sector: r.sector || (emp?.sector ?? ''),
    cargo: r.cargo || (emp?.cargo ?? ''),
    jornada: emp?.jornada ?? '',
    tipoContrato: emp?.tipoContrato ?? '',
    fechaIngreso: emp?.fechaIngreso ? formatFecha(emp.fechaIngreso) : '',
    supervisor: emp?.supervisor ?? '',
    categoria: REGISTRO_NOVEDAD_CATEGORIA_LABEL[r.categoria],
    fecha: formatFecha(r.fecha),
    horario: horaLabel(r) ?? '—',
    descripcion: r.descripcion,
    fotoUrl: r.fotoUrl ?? '',
  }
}

export default function NovedadesInternasPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (user && user.role !== 'admin') {
    router.replace('/dashboard')
    return null
  }

  return <NovedadesInternasContent />
}

function NovedadesInternasContent() {
  const { empleados, registrosNovedad, addRegistroNovedad, updateRegistroNovedad, deleteRegistroNovedad } = useData()

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<RegistroNovedadCategoria | ''>('')
  const [filterEmpleadoId, setFilterEmpleadoId] = useState('')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [filterMes, setFilterMes] = useState('')
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString())

  // ── Modal form ────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Upload foto ───────────────────────────────────────────────────────────
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoPreview, setFotoPreview] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Delete ────────────────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ── Export ────────────────────────────────────────────────────────────────
  const [exportando, setExportando] = useState(false)

  const empleadosActivos = [...empleados]
    .filter(e => e.estado === 'activo')
    .sort((a, b) => a.apellido.localeCompare(b.apellido))

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const registrosFiltrados = registrosNovedad.filter(r => {
    if (filterCategoria && r.categoria !== filterCategoria) return false
    if (filterEmpleadoId && r.empleadoId !== filterEmpleadoId) return false
    if (filterFechaDesde && r.fecha < filterFechaDesde) return false
    if (filterFechaHasta && r.fecha > filterFechaHasta) return false
    if (!filterFechaDesde && !filterFechaHasta) {
      if (filterAnio && !r.fecha.startsWith(filterAnio)) return false
      if (filterMes) {
        const mes = r.fecha.split('-')[1] ?? ''
        if (mes !== filterMes) return false
      }
    }
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        r.empleadoNombre.toLowerCase().includes(q) ||
        r.sector.toLowerCase().includes(q) ||
        r.cargo.toLowerCase().includes(q) ||
        r.descripcion.toLowerCase().includes(q) ||
        REGISTRO_NOVEDAD_CATEGORIA_LABEL[r.categoria].toLowerCase().includes(q)
      )
    }
    return true
  }).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.hora ?? '').localeCompare(a.hora ?? ''))

  // ── Etiqueta del período para el export ───────────────────────────────────
  function periodoLabel(): string {
    if (filterFechaDesde && filterFechaHasta)
      return `${formatFecha(filterFechaDesde)} al ${formatFecha(filterFechaHasta)}`
    if (filterFechaDesde) return `Desde ${formatFecha(filterFechaDesde)}`
    if (filterFechaHasta) return `Hasta ${formatFecha(filterFechaHasta)}`
    const mes = filterMes ? MESES[parseInt(filterMes) - 1] : ''
    return [mes, filterAnio].filter(Boolean).join(' ') || 'Todos los registros'
  }

  function empleadoLabel(): string {
    if (!filterEmpleadoId) return ''
    const emp = empleados.find(e => e.id === filterEmpleadoId)
    return emp ? `${emp.nombre} ${emp.apellido}` : ''
  }

  // ── Export Excel ──────────────────────────────────────────────────────────
  async function exportarExcel() {
    setExportando(true)
    const { utils, writeFile } = await import('xlsx')
    const rows = registrosFiltrados.map(r => {
      const d = enrichRow(r, empleados)
      return {
        'Apellido y Nombre': d.nombre,
        'DNI': d.dni,
        'CUIL': d.cuil,
        'Sector': d.sector,
        'Cargo': d.cargo,
        'Jornada': d.jornada,
        'Tipo Contrato': d.tipoContrato,
        'Fecha Ingreso': d.fechaIngreso,
        'Supervisor': d.supervisor,
        'Categoría': d.categoria,
        'Fecha Novedad': d.fecha,
        'Horario': d.horario,
        'Descripción': d.descripcion,
      }
    })
    const ws = utils.json_to_sheet(rows)

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 22 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 22 },
      { wch: 28 }, { wch: 14 }, { wch: 22 }, { wch: 50 },
    ]

    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Novedades RRHH')

    const periodo = periodoLabel().replace(/\//g, '-')
    const empSuffix = empleadoLabel() ? `_${empleadoLabel().replace(/ /g, '_')}` : ''
    writeFile(wb, `Novedades_RRHH_${periodo}${empSuffix}.xlsx`)
    setExportando(false)
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  async function exportarPDF() {
    setExportando(true)
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const BRAND = [35, 89, 126] as [number, number, number]
    const W = doc.internal.pageSize.getWidth()

    // Header
    doc.setFillColor(...BRAND)
    doc.rect(0, 0, W, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Fundación Neuquén Oeste — Novedades de RRHH', 14, 10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const subtitulo = [periodoLabel(), empleadoLabel()].filter(Boolean).join(' · ')
    doc.text(subtitulo, 14, 17)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, W - 14, 17, { align: 'right' })

    // Tabla
    const rows = registrosFiltrados.map(r => {
      const d = enrichRow(r, empleados)
      return [
        d.nombre, d.dni, d.cuil, d.categoria, d.fecha, d.horario,
        d.sector, d.cargo, d.descripcion,
      ]
    })

    autoTable(doc, {
      startY: 26,
      head: [['Empleado', 'DNI', 'CUIL', 'Categoría', 'Fecha', 'Horario', 'Sector', 'Cargo', 'Descripción']],
      body: rows,
      styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 34 },
        1: { cellWidth: 20 },
        2: { cellWidth: 24 },
        3: { cellWidth: 36 },
        4: { cellWidth: 20 },
        5: { cellWidth: 28 },
        6: { cellWidth: 24 },
        7: { cellWidth: 26 },
        8: { cellWidth: 'auto' },
      },
      didDrawPage: (data) => {
        // Footer paginado
        const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(
          `Página ${data.pageNumber} de ${pageCount} · Portal RRHH — portalfno.com`,
          W / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'center' },
        )
      },
    })

    const periodo = periodoLabel().replace(/\//g, '-')
    const empSuffix = empleadoLabel() ? `_${empleadoLabel().replace(/ /g, '_')}` : ''
    doc.save(`Novedades_RRHH_${periodo}${empSuffix}.pdf`)
    setExportando(false)
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openNew() {
    setForm(emptyForm)
    setFotoPreview('')
    setEditId(null)
    setSubmitError('')
    setShowForm(true)
  }

  function openEdit(r: RegistroNovedad) {
    setForm({
      modoEmpleado: r.empleadoId ? 'lista' : 'manual',
      empleadoId: r.empleadoId ?? '',
      empleadoNombre: r.empleadoNombre,
      sector: r.sector,
      cargo: r.cargo,
      fecha: r.fecha,
      horaTipo: r.horaTipo,
      hora: r.hora ?? '',
      horaDesde: r.horaDesde ?? '',
      horaHasta: r.horaHasta ?? '',
      descripcion: r.descripcion,
      categoria: r.categoria,
      edificio: r.edificio ?? '',
      fotoUrl: r.fotoUrl ?? '',
    })
    setFotoPreview(r.fotoUrl ?? '')
    setEditId(r.id)
    setSubmitError('')
    setShowForm(true)
  }

  function onSelectEmpleado(id: string) {
    const emp = empleados.find(e => e.id === id)
    setForm(f => ({
      ...f,
      empleadoId: id,
      empleadoNombre: emp ? `${emp.nombre} ${emp.apellido}` : '',
      sector: emp?.sector ?? '',
      cargo: emp?.cargo ?? '',
    }))
  }

  const handleFotoChange = useCallback(async (file: File) => {
    if (!supabase) return
    setUploadingFoto(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `registros-novedad/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fno-media').upload(path, file, {
      contentType: file.type, upsert: false,
    })
    if (error) { console.error('[upload foto]', error.message); setUploadingFoto(false); return }
    const { data } = supabase.storage.from('fno-media').getPublicUrl(path)
    setForm(f => ({ ...f, fotoUrl: data.publicUrl }))
    setFotoPreview(data.publicUrl)
    setUploadingFoto(false)
  }, [])

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFotoChange(file)
  }

  function removeFoto() {
    setForm(f => ({ ...f, fotoUrl: '' }))
    setFotoPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!form.categoria) { setSubmitError('Seleccioná una categoría'); return }
    if (!form.empleadoNombre.trim() && form.modoEmpleado === 'manual') { setSubmitError('Ingresá el nombre del empleado'); return }
    if (form.modoEmpleado === 'lista' && !form.empleadoId) { setSubmitError('Seleccioná un empleado'); return }
    if (!form.fecha) { setSubmitError('Ingresá la fecha'); return }
    if (form.horaTipo === 'exacta' && !form.hora) { setSubmitError('Ingresá la hora'); return }
    if (form.horaTipo === 'rango' && (!form.horaDesde || !form.horaHasta)) {
      setSubmitError('Ingresá el horario desde/hasta'); return
    }
    setSubmitting(true)

    const payload: Omit<RegistroNovedad, 'id' | 'creadoEn'> = {
      empleadoId: form.modoEmpleado === 'lista' ? form.empleadoId || undefined : undefined,
      empleadoNombre: form.modoEmpleado === 'lista'
        ? form.empleadoNombre
        : form.empleadoNombre.trim(),
      sector: form.sector.trim(),
      cargo: form.cargo.trim(),
      fecha: form.fecha,
      horaTipo: form.horaTipo,
      hora: form.horaTipo === 'exacta' ? form.hora : undefined,
      horaDesde: form.horaTipo === 'rango' ? form.horaDesde : undefined,
      horaHasta: form.horaTipo === 'rango' ? form.horaHasta : undefined,
      descripcion: form.descripcion.trim(),
      categoria: form.categoria as RegistroNovedadCategoria,
      edificio: form.edificio.trim() || undefined,
      fotoUrl: form.fotoUrl || undefined,
    }

    if (editId) {
      updateRegistroNovedad(editId, payload)
    } else {
      await addRegistroNovedad(payload)
      sendEmail('nuevo_registro_novedad', {
        empleadoNombre: payload.empleadoNombre,
        sector: payload.sector,
        cargo: payload.cargo,
        categoria: REGISTRO_NOVEDAD_CATEGORIA_LABEL[payload.categoria],
        fecha: formatFecha(payload.fecha),
        horaTipo: payload.horaTipo,
        hora: payload.hora ?? '',
        horaDesde: payload.horaDesde ?? '',
        horaHasta: payload.horaHasta ?? '',
        descripcion: payload.descripcion,
        fotoUrl: payload.fotoUrl ?? '',
      })
    }
    setSubmitting(false)
    setShowForm(false)
  }

  function handleDelete(id: string) {
    deleteRegistroNovedad(id)
    setConfirmDeleteId(null)
  }

  const aniosDisponibles = Array.from(
    new Set([new Date().getFullYear().toString(), ...registrosNovedad.map(r => r.fecha.slice(0, 4))])
  ).sort((a, b) => b.localeCompare(a))

  const usandoRangoFecha = !!(filterFechaDesde || filterFechaHasta)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novedades Internas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Registro privado de RRHH — solo visible para administrador
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Empleado */}
          <select
            value={filterEmpleadoId}
            onChange={e => setFilterEmpleadoId(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todos los empleados</option>
            {empleadosActivos.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.apellido}, {emp.nombre}</option>
            ))}
          </select>

          {/* Categoría */}
          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value as RegistroNovedadCategoria | '')}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todas las categorías</option>
            {REGISTRO_NOVEDAD_CATEGORIAS.map(c => (
              <option key={c} value={c}>{REGISTRO_NOVEDAD_CATEGORIA_LABEL[c]}</option>
            ))}
          </select>
        </div>

        {/* Segunda fila: mes/año vs rango de fechas */}
        <div className="flex flex-wrap items-center gap-3">
          {!usandoRangoFecha && (
            <>
              <select
                value={filterMes}
                onChange={e => setFilterMes(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todos los meses</option>
                {MESES.map((m, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </select>
              <select
                value={filterAnio}
                onChange={e => setFilterAnio(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todos los años</option>
                {aniosDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">ó</span>
            </>
          )}

          {/* Rango de fechas */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Rango:</label>
            <input
              type="date"
              value={filterFechaDesde}
              onChange={e => { setFilterFechaDesde(e.target.value); setFilterMes(''); setFilterAnio('') }}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-xs text-gray-400">al</span>
            <input
              type="date"
              value={filterFechaHasta}
              onChange={e => { setFilterFechaHasta(e.target.value); setFilterMes(''); setFilterAnio('') }}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {usandoRangoFecha && (
              <button
                onClick={() => { setFilterFechaDesde(''); setFilterFechaHasta(''); setFilterAnio(new Date().getFullYear().toString()) }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                title="Limpiar rango"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de export */}
      {registrosFiltrados.length > 0 && (
        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
              {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'registro' : 'registros'} — {periodoLabel()}
              {empleadoLabel() ? ` · ${empleadoLabel()}` : ''}
            </p>
            <p className="text-xs text-brand-600 dark:text-brand-400">Exportá los registros filtrados</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarExcel}
              disabled={exportando}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Excel
            </button>
            <button
              onClick={exportarPDF}
              disabled={exportando}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {registrosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {registrosNovedad.length === 0
              ? 'Todavía no hay registros cargados'
              : 'No hay registros que coincidan con los filtros'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {registrosFiltrados.map(r => (
            <div
              key={r.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {r.fotoUrl && (
                  <img
                    src={r.fotoUrl}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-600 cursor-pointer"
                    onClick={() => window.open(r.fotoUrl, '_blank')}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${REGISTRO_NOVEDAD_CATEGORIA_COLOR[r.categoria]}`}>
                        {REGISTRO_NOVEDAD_CATEGORIA_LABEL[r.categoria]}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {r.empleadoNombre}
                      </span>
                      {(r.sector || r.cargo) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          · {[r.cargo, r.sector].filter(Boolean).join(' — ')}
                        </span>
                      )}
                      {r.edificio && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          · {r.edificio}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatFecha(r.fecha)}
                    </span>
                    {horaLabel(r) && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {horaLabel(r)}
                      </span>
                    )}
                  </div>

                  {r.descripcion && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
                      {r.descripcion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal formulario ──────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editId ? 'Editar registro' : 'Nuevo registro de novedad'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Empleado */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <User className="inline w-4 h-4 mr-1" />Empleado
                </label>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden mb-3 w-fit">
                  {(['lista', 'manual'] as ModoEmpleado[]).map(modo => (
                    <button
                      key={modo}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, modoEmpleado: modo, empleadoId: '', empleadoNombre: '', sector: '', cargo: '' }))}
                      className={`px-4 py-1.5 text-xs font-semibold transition-colors ${form.modoEmpleado === modo ? 'bg-brand-700 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      {modo === 'lista' ? 'Elegir de la lista' : 'Ingresar manualmente'}
                    </button>
                  ))}
                </div>
                {form.modoEmpleado === 'lista' ? (
                  <select
                    value={form.empleadoId}
                    onChange={e => onSelectEmpleado(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Seleccionar empleado...</option>
                    {empleadosActivos.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre} — {emp.cargo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Nombre y apellido"
                    value={form.empleadoNombre}
                    onChange={e => setForm(f => ({ ...f, empleadoNombre: e.target.value }))}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}
              </div>

              {/* Sector / Cargo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    <Building2 className="inline w-3.5 h-3.5 mr-1" />Sector
                  </label>
                  <input
                    type="text"
                    placeholder="Sector"
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    <Briefcase className="inline w-3.5 h-3.5 mr-1" />Cargo
                  </label>
                  <input
                    type="text"
                    placeholder="Cargo"
                    value={form.cargo}
                    onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Edificio / Área (opcional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  <Building2 className="inline w-3.5 h-3.5 mr-1" />Edificio / Área <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Edificio Central, Planta Baja, Aula 3..."
                  value={form.edificio}
                  onChange={e => setForm(f => ({ ...f, edificio: e.target.value }))}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  <Tag className="inline w-3.5 h-3.5 mr-1" />Categoría
                </label>
                <select
                  value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value as RegistroNovedadCategoria }))}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Seleccionar tipo...</option>
                  {REGISTRO_NOVEDAD_CATEGORIAS.map(c => (
                    <option key={c} value={c}>{REGISTRO_NOVEDAD_CATEGORIA_LABEL[c]}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  <Calendar className="inline w-3.5 h-3.5 mr-1" />Fecha
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Horario */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  <Clock className="inline w-3.5 h-3.5 mr-1" />Horario
                </label>
                <div className="flex gap-4 mb-3">
                  {(['sin_hora', 'exacta', 'rango'] as HoraTipo[]).map(tipo => (
                    <label key={tipo} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="horaTipo"
                        value={tipo}
                        checked={form.horaTipo === tipo}
                        onChange={() => setForm(f => ({ ...f, horaTipo: tipo }))}
                        className="accent-brand-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {tipo === 'sin_hora' ? 'Sin hora' : tipo === 'exacta' ? 'A las...' : 'Desde/Hasta'}
                      </span>
                    </label>
                  ))}
                </div>
                {form.horaTipo === 'exacta' && (
                  <input
                    type="time"
                    value={form.hora}
                    onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}
                {form.horaTipo === 'rango' && (
                  <div className="flex items-center gap-2">
                    <input type="time" value={form.horaDesde} onChange={e => setForm(f => ({ ...f, horaDesde: e.target.value }))} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <span className="text-sm text-gray-500">hasta</span>
                    <input type="time" value={form.horaHasta} onChange={e => setForm(f => ({ ...f, horaHasta: e.target.value }))} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  <FileText className="inline w-3.5 h-3.5 mr-1" />Descripción del motivo
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción detallada..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  <ImageIcon className="inline w-3.5 h-3.5 mr-1" />Foto adjunta (opcional)
                </label>
                {fotoPreview ? (
                  <div className="relative inline-block">
                    <img src={fotoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
                    <button type="button" onClick={removeFoto} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFoto}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors disabled:opacity-50"
                  >
                    {uploadingFoto ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4" /> Subir foto</>}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
              </div>

              {submitError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{submitError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFoto}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-700 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editId ? 'Guardar cambios' : 'Guardar registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ─────────────────────────────────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Eliminar registro</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
