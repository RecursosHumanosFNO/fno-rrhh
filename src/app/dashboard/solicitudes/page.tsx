'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import {
  SOLICITUD_TIPO_LABEL, SOLICITUD_ESTADO_COLOR, SOLICITUD_ESTADO_LABEL, formatFecha,
} from '@/lib/utils'
import type { SolicitudTipo } from '@/types'
import {
  ClipboardList, Plus, Search, X, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Send, Hourglass, Save, Edit2,
} from 'lucide-react'

const TIPOS: SolicitudTipo[] = [
  'ausencia', 'llegada_tarde', 'salida_anticipada',
  'licencia_medica', 'licencia_estudio', 'licencia_maternidad_paternidad', 'licencia_duelo',
  'vacaciones', 'permiso_personal',
  'horas_extra', 'cambio_turno', 'guardia_turno_especial', 'tarea_fuera_area',
  'capacitacion',
  'accidente_laboral', 'suspension', 'observacion_comportamiento', 'conflicto_interpersonal',
  'entrega_documentacion', 'reconocimiento', 'pedido_administrativo', 'otro',
]

// Agrupados para el select del modal (más fácil de leer)
const TIPO_GRUPOS = [
  { label: 'Asistencia', tipos: ['ausencia', 'llegada_tarde', 'salida_anticipada'] },
  { label: 'Licencias y Permisos', tipos: ['licencia_medica', 'licencia_estudio', 'licencia_maternidad_paternidad', 'licencia_duelo', 'vacaciones', 'permiso_personal'] },
  { label: 'Jornada Laboral', tipos: ['horas_extra', 'cambio_turno', 'guardia_turno_especial', 'tarea_fuera_area'] },
  { label: 'Formación', tipos: ['capacitacion'] },
  { label: 'Incidentes / RRHH', tipos: ['accidente_laboral', 'suspension', 'observacion_comportamiento', 'conflicto_interpersonal'] },
  { label: 'Administrativo', tipos: ['entrega_documentacion', 'reconocimiento', 'pedido_administrativo', 'otro'] },
] as const

export default function SolicitudesPage() {
  const { user } = useAuth()
  const { empleados, solicitudes, addSolicitud, approveSolicitud, rejectSolicitud, editSolicitud, cancelSolicitud } = useData()
  const isAdmin = user?.role === 'admin'

  const [estadoFilter, setEstadoFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [query, setQuery] = useState('')
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('')
  const [fechaHastaFilter, setFechaHastaFilter] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editEstado, setEditEstado] = useState<'aprobado' | 'rechazado'>('aprobado')

  // New solicitud form state
  const [newForm, setNewForm] = useState({
    tipo: 'permiso_personal' as SolicitudTipo,
    fechaInicio: '', fechaFin: '',
    horarioDesde: '', horarioHasta: '',
    descripcion: '',
  })
  const [newError, setNewError] = useState('')

  const base = isAdmin
    ? solicitudes
    : solicitudes.filter(s => s.empleadoId === user?.empleadoId)

  const filtered = base.filter(s => {
    const emp = empleados.find(e => e.id === s.empleadoId)
    const matchQuery = !query || (emp ? `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(query.toLowerCase()) : false)
    const matchEstado = !estadoFilter || s.estado === estadoFilter
    const matchTipo = !tipoFilter || s.tipo === tipoFilter
    const matchDesde = !fechaDesdeFilter || s.fechaInicio >= fechaDesdeFilter
    const matchHasta = !fechaHastaFilter || s.fechaInicio <= fechaHastaFilter
    return matchQuery && matchEstado && matchTipo && matchDesde && matchHasta
  }).sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))

  const pendientes = base.filter(s => s.estado === 'pendiente').length

  function handleApprove(id: string) {
    approveSolicitud(id, comments[id] ?? '')
    setComments(prev => { const n = { ...prev }; delete n[id]; return n })
    setExpandedId(null)
  }

  function handleReject(id: string) {
    rejectSolicitud(id, comments[id] ?? '')
    setComments(prev => { const n = { ...prev }; delete n[id]; return n })
    setExpandedId(null)
  }

  function handleEdit(id: string) {
    editSolicitud(id, editEstado, editComment)
    setEditingId(null)
    setEditComment('')
  }

  function startEdit(sol: { id: string; estado: string; comentarioAdmin?: string }) {
    setEditingId(sol.id)
    setEditEstado(sol.estado as 'aprobado' | 'rechazado')
    setEditComment(sol.comentarioAdmin ?? '')
  }

  function handleSubmitNueva() {
    setNewError('')
    if (!newForm.fechaInicio) { setNewError('Indicá la fecha de inicio.'); return }
    if (!newForm.descripcion.trim()) { setNewError('Completá la descripción.'); return }
    if (!user?.empleadoId) return
    addSolicitud({
      empleadoId: user.empleadoId,
      tipo: newForm.tipo,
      fechaInicio: newForm.fechaInicio,
      fechaFin: newForm.fechaFin || undefined,
      horarioDesde: newForm.horarioDesde || undefined,
      horarioHasta: newForm.horarioHasta || undefined,
      descripcion: newForm.descripcion,
    })
    setShowNueva(false)
    setNewForm({ tipo: 'permiso_personal', fechaInicio: '', fechaFin: '', horarioDesde: '', horarioHasta: '', descripcion: '' })
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isAdmin ? 'Gestión de Solicitudes' : 'Mis Solicitudes'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {filtered.length} solicitudes · {pendientes} pendientes
          </p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowNueva(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nueva solicitud
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pendientes', count: base.filter(s => s.estado === 'pendiente').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: Clock },
          { label: 'Aprobadas', count: base.filter(s => s.estado === 'aprobado').length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
          { label: 'Rechazadas', count: base.filter(s => s.estado === 'rechazado').length, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', icon: XCircle },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
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
        <select className="form-select w-auto text-sm" value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
        <select className="form-select w-auto text-sm" value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPO_GRUPOS.map(grupo => (
            <optgroup key={grupo.label} label={`── ${grupo.label}`}>
              {grupo.tipos.map(t => (
                <option key={t} value={t}>{SOLICITUD_TIPO_LABEL[t as SolicitudTipo]}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {isAdmin && (
          <>
            <input
              type="date"
              className="form-input w-auto text-sm"
              value={fechaDesdeFilter}
              onChange={e => setFechaDesdeFilter(e.target.value)}
              title="Desde"
            />
            <span className="text-slate-400 text-sm self-center">—</span>
            <input
              type="date"
              className="form-input w-auto text-sm"
              value={fechaHastaFilter}
              onChange={e => setFechaHastaFilter(e.target.value)}
              title="Hasta"
            />
          </>
        )}
        {(query || estadoFilter || tipoFilter || fechaDesdeFilter || fechaHastaFilter) && (
          <button onClick={() => { setQuery(''); setEstadoFilter(''); setTipoFilter(''); setFechaDesdeFilter(''); setFechaHastaFilter('') }} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Solicitudes list */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay solicitudes</p>
          {!isAdmin && (
            <button onClick={() => setShowNueva(true)} className="btn-primary mt-3">
              <Plus className="w-4 h-4" /> Nueva solicitud
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sol => {
            const emp = empleados.find(e => e.id === sol.empleadoId)
            const isOpen = expandedId === sol.id
            return (
              <div key={sol.id} className="card overflow-hidden">
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : sol.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    sol.estado === 'aprobado' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    sol.estado === 'rechazado' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                    'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                  }`}>
                    {sol.estado === 'aprobado' ? <CheckCircle2 className="w-5 h-5" /> :
                     sol.estado === 'rechazado' ? <XCircle className="w-5 h-5" /> :
                     <Clock className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        {SOLICITUD_TIPO_LABEL[sol.tipo]}
                      </p>
                      <span className={`badge ${SOLICITUD_ESTADO_COLOR[sol.estado]}`}>
                        {SOLICITUD_ESTADO_LABEL[sol.estado]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAdmin && emp ? `${emp.nombre} ${emp.apellido} · ` : ''}
                      {formatFecha(sol.fechaInicio)}{sol.fechaFin ? ` al ${formatFecha(sol.fechaFin)}` : ''}
                      {sol.horarioDesde ? ` · ${sol.horarioDesde}${sol.horarioHasta ? ` a ${sol.horarioHasta} hs` : ' hs'}` : ''}
                      {' · '}Creada el {formatFecha(sol.fechaCreacion)}
                    </p>
                  </div>

                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30 animate-fade-in">
                    {isAdmin && emp && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                          {emp.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emp.nombre} {emp.apellido}</p>
                          <p className="text-xs text-slate-400">{emp.cargo} · {emp.sector}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descripción</p>
                      {sol.descripcion}
                    </div>

                    {/* Línea de tiempo del estado */}
                    <SolicitudTimeline sol={sol} />

                    {sol.comentarioAdmin && (
                      <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 border border-brand-100 dark:border-brand-800">
                        <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 mb-1">
                          Respuesta de RRHH {sol.estado === 'aprobado' ? '✅' : '❌'}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{sol.comentarioAdmin}</p>
                        {sol.fechaResolucion && (
                          <p className="text-xs text-slate-400 mt-1">{formatFecha(sol.fechaResolucion)}</p>
                        )}
                      </div>
                    )}

                    {/* Admin actions — pendiente */}
                    {isAdmin && sol.estado === 'pendiente' && (
                      <div className="space-y-2">
                        <textarea
                          className="form-input text-sm resize-none"
                          rows={2}
                          placeholder="Comentario para el empleado (opcional)"
                          value={comments[sol.id] ?? ''}
                          onChange={e => setComments(prev => ({ ...prev, [sol.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(sol.id)} className="btn-success flex-1 justify-center">
                            <CheckCircle2 className="w-4 h-4" /> Aprobar
                          </button>
                          <button onClick={() => handleReject(sol.id)} className="btn-danger flex-1 justify-center">
                            <XCircle className="w-4 h-4" /> Rechazar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Admin actions — editar resolución ya tomada */}
                    {isAdmin && (sol.estado === 'aprobado' || sol.estado === 'rechazado') && (
                      editingId === sol.id ? (
                        <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Editar resolución</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditEstado('aprobado')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium border transition-colors ${editEstado === 'aprobado' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                              ✅ Aprobada
                            </button>
                            <button
                              onClick={() => setEditEstado('rechazado')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium border transition-colors ${editEstado === 'rechazado' ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                              ❌ Rechazada
                            </button>
                          </div>
                          <textarea
                            className="form-input text-sm resize-none"
                            rows={2}
                            placeholder="Comentario para el empleado (opcional)"
                            value={editComment}
                            onChange={e => setEditComment(e.target.value)}
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="btn-secondary text-sm">Cancelar</button>
                            <button onClick={() => handleEdit(sol.id)} className="btn-primary text-sm">
                              <Save className="w-4 h-4" /> Guardar cambios
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            onClick={() => startEdit(sol)}
                            className="text-sm text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar resolución
                          </button>
                        </div>
                      )
                    )}

                    {/* Employee cancel */}
                    {!isAdmin && sol.estado === 'pendiente' && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setConfirmCancel(sol.id)}
                          className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar solicitud
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmar cancelación */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmCancel(null)}>
          <div className="card w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Cancelar solicitud?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Esta acción eliminará la solicitud. No se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmCancel(null)}
                  className="btn-secondary flex-1 justify-center"
                >
                  Volver
                </button>
                <button
                  onClick={() => { cancelSolicitud(confirmCancel); setConfirmCancel(null); setExpandedId(null) }}
                  className="btn-danger flex-1 justify-center"
                >
                  Sí, cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* (timeline component definido abajo) */}

      {/* Nueva solicitud modal */}
      {showNueva && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNueva(false)}>
          <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Nueva Solicitud</p>
              <button onClick={() => setShowNueva(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {newError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-2.5 text-sm">
                  {newError}
                </div>
              )}
              <div>
                <label className="form-label">Tipo de solicitud *</label>
                <select className="form-select" value={newForm.tipo} onChange={e => setNewForm(f => ({ ...f, tipo: e.target.value as SolicitudTipo }))}>
                  {TIPO_GRUPOS.map(grupo => (
                    <optgroup key={grupo.label} label={`── ${grupo.label}`}>
                      {grupo.tipos.map(t => (
                        <option key={t} value={t}>{SOLICITUD_TIPO_LABEL[t as SolicitudTipo]}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Fecha inicio *</label>
                  <input className="form-input" type="date" value={newForm.fechaInicio} onChange={e => setNewForm(f => ({ ...f, fechaInicio: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Fecha fin</label>
                  <input className="form-input" type="date" value={newForm.fechaFin} onChange={e => setNewForm(f => ({ ...f, fechaFin: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Horario <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">Desde</span>
                    <input
                      className="form-input pl-14 text-sm"
                      type="time"
                      value={newForm.horarioDesde}
                      onChange={e => setNewForm(f => ({ ...f, horarioDesde: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">Hasta</span>
                    <input
                      className="form-input pl-14 text-sm"
                      type="time"
                      value={newForm.horarioHasta}
                      onChange={e => setNewForm(f => ({ ...f, horarioHasta: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label">Descripción / Motivo *</label>
                <textarea
                  className="form-input resize-none"
                  rows={3}
                  placeholder="Describí brevemente el motivo..."
                  value={newForm.descripcion}
                  onChange={e => setNewForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowNueva(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleSubmitNueva} className="btn-primary">Enviar solicitud</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Línea de tiempo del estado de una solicitud ──────────────────────────────
function SolicitudTimeline({ sol }: { sol: { estado: string; fechaCreacion: string; fechaResolucion?: string } }) {
  const resuelto = sol.estado === 'aprobado' || sol.estado === 'rechazado'
  const aprobado = sol.estado === 'aprobado'
  const rechazado = sol.estado === 'rechazado'

  const steps = [
    {
      label: 'Solicitud enviada',
      fecha: sol.fechaCreacion,
      icon: Send,
      state: 'done' as const,
      color: 'text-brand-600 bg-brand-100 dark:bg-brand-900/40',
      line: 'bg-brand-300 dark:bg-brand-700',
    },
    {
      label: resuelto ? 'Revisada por RRHH' : 'En revisión por RRHH',
      fecha: resuelto ? sol.fechaResolucion : undefined,
      sub: resuelto ? undefined : 'Esperando respuesta del administrador',
      icon: resuelto ? CheckCircle2 : Hourglass,
      state: resuelto ? ('done' as const) : ('active' as const),
      color: resuelto
        ? 'text-brand-600 bg-brand-100 dark:bg-brand-900/40'
        : 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 animate-pulse',
      line: resuelto ? 'bg-brand-300 dark:bg-brand-700' : 'bg-slate-200 dark:bg-slate-700',
    },
    {
      label: aprobado ? 'Solicitud aprobada' : rechazado ? 'Solicitud rechazada' : 'Resolución',
      fecha: resuelto ? sol.fechaResolucion : undefined,
      icon: aprobado ? CheckCircle2 : rechazado ? XCircle : Clock,
      state: resuelto ? ('done' as const) : ('pending' as const),
      color: aprobado
        ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40'
        : rechazado
          ? 'text-red-600 bg-red-100 dark:bg-red-900/40'
          : 'text-slate-400 bg-slate-100 dark:bg-slate-800',
      line: '',
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Seguimiento</p>
      <div className="space-y-0">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isLast = i === steps.length - 1
          return (
            <div key={i} className="flex gap-3">
              {/* Columna del ícono + línea */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {!isLast && <div className={`w-0.5 flex-1 min-h-[20px] my-1 ${step.line || 'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
              {/* Contenido */}
              <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm font-medium ${
                  step.state === 'pending' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {step.label}
                </p>
                {step.fecha && (
                  <p className="text-xs text-slate-400 mt-0.5">{formatFecha(step.fecha)}</p>
                )}
                {step.sub && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{step.sub}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
