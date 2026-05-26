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
  MessageSquare, Paperclip, ChevronDown, ChevronUp,
} from 'lucide-react'

const TIPOS: SolicitudTipo[] = [
  'permiso_personal', 'vacaciones', 'licencia_medica',
  'llegada_tarde', 'ausencia', 'pedido_administrativo',
]

export default function SolicitudesPage() {
  const { user } = useAuth()
  const { empleados, solicitudes, addSolicitud, approveSolicitud, rejectSolicitud } = useData()
  const isAdmin = user?.role === 'admin'

  const [estadoFilter, setEstadoFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [comments, setComments] = useState<Record<string, string>>({})

  // New solicitud form state
  const [newForm, setNewForm] = useState({
    tipo: 'permiso_personal' as SolicitudTipo,
    fechaInicio: '', fechaFin: '', descripcion: '',
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
    return matchQuery && matchEstado && matchTipo
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
      descripcion: newForm.descripcion,
    })
    setShowNueva(false)
    setNewForm({ tipo: 'permiso_personal', fechaInicio: '', fechaFin: '', descripcion: '' })
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
          {TIPOS.map(t => <option key={t} value={t}>{SOLICITUD_TIPO_LABEL[t]}</option>)}
        </select>
        {(query || estadoFilter || tipoFilter) && (
          <button onClick={() => { setQuery(''); setEstadoFilter(''); setTipoFilter('') }} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
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

                    {/* Admin actions */}
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
                          <button
                            onClick={() => handleApprove(sol.id)}
                            className="btn-success flex-1 justify-center"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(sol.id)}
                            className="btn-danger flex-1 justify-center"
                          >
                            <XCircle className="w-4 h-4" /> Rechazar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
                  {TIPOS.map(t => <option key={t} value={t}>{SOLICITUD_TIPO_LABEL[t]}</option>)}
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
