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
import type { RegistroNovedad, RegistroNovedadCategoria } from '@/types'
import {
  Plus, Search, Filter, Trash2, Pencil, X, Upload, Image as ImageIcon,
  User, Calendar, Clock, FileText, Tag, Building2, Briefcase,
  ChevronDown, AlertTriangle, CheckCircle2, Loader2,
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
  fotoUrl: '',
}

function sendEmail(type: string, data: Record<string, string>) {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => {})
}

export default function NovedadesInternasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { empleados, registrosNovedad, addRegistroNovedad, updateRegistroNovedad, deleteRegistroNovedad } = useData()

  // Redirigir si no es admin
  if (user && user.role !== 'admin') {
    router.replace('/dashboard')
    return null
  }

  return <NovedadesInternasContent />
}

function NovedadesInternasContent() {
  const { empleados, registrosNovedad, addRegistroNovedad, updateRegistroNovedad, deleteRegistroNovedad } = useData()

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<RegistroNovedadCategoria | ''>('')
  const [filterMes, setFilterMes] = useState('')
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString())

  // Modal
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Upload foto
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoPreview, setFotoPreview] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Listado de empleados activos ordenado
  const empleadosActivos = [...empleados]
    .filter(e => e.estado === 'activo')
    .sort((a, b) => a.apellido.localeCompare(b.apellido))

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const registrosFiltrados = registrosNovedad.filter(r => {
    if (filterCategoria && r.categoria !== filterCategoria) return false
    if (filterAnio && !r.fecha.startsWith(filterAnio)) return false
    if (filterMes) {
      const mes = parseInt(r.fecha.split('-')[1] ?? '0')
      if (mes !== parseInt(filterMes)) return false
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
  })

  // ── Abrir form nuevo / editar ──────────────────────────────────────────────
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
      fotoUrl: r.fotoUrl ?? '',
    })
    setFotoPreview(r.fotoUrl ?? '')
    setEditId(r.id)
    setSubmitError('')
    setShowForm(true)
  }

  // ── Selección de empleado de la lista ─────────────────────────────────────
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

  // ── Upload foto ───────────────────────────────────────────────────────────
  const handleFotoChange = useCallback(async (file: File) => {
    if (!supabase) return
    setUploadingFoto(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `registros-novedad/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fno-media').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (error) {
      console.error('[upload foto registro]', error.message)
      setUploadingFoto(false)
      return
    }
    const { data } = supabase.storage.from('fno-media').getPublicUrl(path)
    const url = data.publicUrl
    setForm(f => ({ ...f, fotoUrl: url }))
    setFotoPreview(url)
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

  // ── Guardar ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (!form.categoria) { setSubmitError('Seleccioná una categoría'); return }
    if (!form.empleadoNombre.trim()) { setSubmitError('Ingresá el nombre del empleado'); return }
    if (!form.fecha) { setSubmitError('Ingresá la fecha'); return }
    if (form.horaTipo === 'exacta' && !form.hora) { setSubmitError('Ingresá la hora'); return }
    if (form.horaTipo === 'rango' && (!form.horaDesde || !form.horaHasta)) {
      setSubmitError('Ingresá el horario desde/hasta')
      return
    }

    setSubmitting(true)

    const payload: Omit<RegistroNovedad, 'id' | 'creadoEn'> = {
      empleadoId: form.modoEmpleado === 'lista' ? form.empleadoId || undefined : undefined,
      empleadoNombre: form.empleadoNombre.trim(),
      sector: form.sector.trim(),
      cargo: form.cargo.trim(),
      fecha: form.fecha,
      horaTipo: form.horaTipo,
      hora: form.horaTipo === 'exacta' ? form.hora : undefined,
      horaDesde: form.horaTipo === 'rango' ? form.horaDesde : undefined,
      horaHasta: form.horaTipo === 'rango' ? form.horaHasta : undefined,
      descripcion: form.descripcion.trim(),
      categoria: form.categoria as RegistroNovedadCategoria,
      fotoUrl: form.fotoUrl || undefined,
    }

    if (editId) {
      updateRegistroNovedad(editId, payload)
    } else {
      await addRegistroNovedad(payload)
      // Email de notificación al admin
      const categoriaLabel = REGISTRO_NOVEDAD_CATEGORIA_LABEL[payload.categoria]
      const fechaFormateada = formatFecha(payload.fecha)
      sendEmail('nuevo_registro_novedad', {
        empleadoNombre: payload.empleadoNombre,
        sector: payload.sector,
        cargo: payload.cargo,
        categoria: categoriaLabel,
        fecha: fechaFormateada,
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

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    deleteRegistroNovedad(id)
    setConfirmDeleteId(null)
  }

  // ── Info de hora para mostrar ─────────────────────────────────────────────
  function horaLabel(r: RegistroNovedad) {
    if (r.horaTipo === 'exacta' && r.hora) return `A las ${r.hora} hs`
    if (r.horaTipo === 'rango' && r.horaDesde) return `${r.horaDesde} — ${r.horaHasta} hs`
    return null
  }

  // ── Años disponibles para filtro ──────────────────────────────────────────
  const aniosDisponibles = Array.from(
    new Set(registrosNovedad.map(r => r.fecha.slice(0, 4)))
  ).sort((a, b) => b.localeCompare(a))
  if (!aniosDisponibles.includes(new Date().getFullYear().toString())) {
    aniosDisponibles.unshift(new Date().getFullYear().toString())
  }

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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 flex flex-wrap gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por empleado, categoría..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

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

        {/* Mes */}
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

        {/* Año */}
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
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'registro' : 'registros'}
        {registrosNovedad.length !== registrosFiltrados.length && ` de ${registrosNovedad.length} total`}
      </p>

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
                {/* Foto thumbnail */}
                {r.fotoUrl && (
                  <img
                    src={r.fotoUrl}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-600 cursor-pointer"
                    onClick={() => window.open(r.fotoUrl, '_blank')}
                  />
                )}

                <div className="flex-1 min-w-0">
                  {/* Fila superior */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${REGISTRO_NOVEDAD_CATEGORIA_COLOR[r.categoria]}`}>
                        {REGISTRO_NOVEDAD_CATEGORIA_LABEL[r.categoria]}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {r.empleadoNombre}
                      </span>
                      {r.sector && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          · {r.cargo}{r.sector ? ` — ${r.sector}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Acciones */}
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

                  {/* Fecha y hora */}
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

                  {/* Descripción */}
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

      {/* ── Modal de formulario ────────────────────────────────────────────── */}
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
                  <User className="inline w-4 h-4 mr-1" />
                  Empleado
                </label>

                {/* Toggle modo */}
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden mb-3 w-fit">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, modoEmpleado: 'lista', empleadoId: '', empleadoNombre: '', sector: '', cargo: '' }))}
                    className={`px-4 py-1.5 text-xs font-semibold transition-colors ${form.modoEmpleado === 'lista' ? 'bg-brand-700 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    Elegir de la lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, modoEmpleado: 'manual', empleadoId: '' }))}
                    className={`px-4 py-1.5 text-xs font-semibold transition-colors ${form.modoEmpleado === 'manual' ? 'bg-brand-700 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    Ingresar manualmente
                  </button>
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

              {/* Sector y Cargo */}
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
                <div className="flex gap-3 mb-3">
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
                    <input
                      type="time"
                      value={form.horaDesde}
                      onChange={e => setForm(f => ({ ...f, horaDesde: e.target.value }))}
                      className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-500">hasta</span>
                    <input
                      type="time"
                      value={form.horaHasta}
                      onChange={e => setForm(f => ({ ...f, horaHasta: e.target.value }))}
                      className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
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
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={removeFoto}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
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
                    {uploadingFoto ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Subir foto</>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileInput}
                />
              </div>

              {/* Error */}
              {submitError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
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
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
