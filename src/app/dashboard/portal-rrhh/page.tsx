'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import {
  TICKET_ESTADO_LABEL, TICKET_ESTADO_COLOR, TICKET_TIPO_LABEL, formatFecha,
} from '@/lib/utils'
import type { TicketTipo, TicketEstado } from '@/types'
import {
  HeadphonesIcon, Plus, X, MessageSquare, Clock, CheckCircle2,
  Circle, ChevronDown, ChevronUp, Send, FileCheck, HelpCircle,
  RefreshCw, AlertCircle, MoreHorizontal,
} from 'lucide-react'

const TIPOS: TicketTipo[] = ['certificado_laboral', 'consulta', 'actualizacion_datos', 'reclamo', 'otro']

const TIPO_ICONS: Record<TicketTipo, React.ElementType> = {
  certificado_laboral: FileCheck,
  consulta: HelpCircle,
  actualizacion_datos: RefreshCw,
  reclamo: AlertCircle,
  otro: MoreHorizontal,
}

export default function PortalRRHHPage() {
  const { user } = useAuth()
  const { empleados, tickets, addTicket, respondTicket } = useData()
  const isAdmin = user?.role === 'admin'

  const [showNuevo, setShowNuevo] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [estadoFilter, setEstadoFilter] = useState('')
  const [respuesta, setRespuesta] = useState<Record<string, string>>({})
  const [estadoResp, setEstadoResp] = useState<Record<string, TicketEstado>>({})

  // New ticket form
  const [newForm, setNewForm] = useState({
    tipo: 'consulta' as TicketTipo,
    asunto: '',
    descripcion: '',
  })
  const [newError, setNewError] = useState('')

  const base = isAdmin
    ? tickets
    : tickets.filter(t => t.empleadoId === user?.empleadoId)

  const filtered = base
    .filter(t => !estadoFilter || t.estado === estadoFilter)
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))

  const abiertos = base.filter(t => t.estado === 'abierto' || t.estado === 'en_proceso').length

  function handleNuevoTicket() {
    setNewError('')
    if (!newForm.asunto.trim()) { setNewError('Completá el asunto.'); return }
    if (!newForm.descripcion.trim()) { setNewError('Completá la descripción.'); return }
    if (!user?.empleadoId) return
    addTicket({
      empleadoId: user.empleadoId,
      tipo: newForm.tipo,
      asunto: newForm.asunto,
      descripcion: newForm.descripcion,
    })
    setShowNuevo(false)
    setNewForm({ tipo: 'consulta', asunto: '', descripcion: '' })
  }

  function handleResponder(ticketId: string) {
    const resp = respuesta[ticketId] ?? ''
    const estado = estadoResp[ticketId] ?? 'en_proceso'
    respondTicket(ticketId, resp, estado)
    setRespuesta(prev => { const n = { ...prev }; delete n[ticketId]; return n })
    setExpandedId(null)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Portal de RRHH</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {isAdmin ? `${abiertos} tickets activos` : 'Sistema de pedidos y consultas a Recursos Humanos'}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowNuevo(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo pedido
          </button>
        )}
      </div>

      {/* Info cards for employee */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Certificado laboral', desc: 'Para bancos, alquileres, etc.', icon: FileCheck, color: 'text-brand-700 bg-blue-50 dark:bg-blue-900/20', tipo: 'certificado_laboral' as TicketTipo },
            { label: 'Consultas generales', desc: 'Dudas sobre liquidación, contratos, etc.', icon: HelpCircle, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', tipo: 'consulta' as TicketTipo },
            { label: 'Actualización de datos', desc: 'Cambio de datos personales o bancarios', icon: RefreshCw, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', tipo: 'actualizacion_datos' as TicketTipo },
          ].map(({ label, desc, icon: Icon, color, tipo }) => (
            <div
              key={label}
              className="card-hover p-4 flex items-start gap-3 cursor-pointer"
              onClick={() => { setNewForm(f => ({ ...f, tipo })); setShowNuevo(true) }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats for admin */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Abiertos', count: base.filter(t => t.estado === 'abierto').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: Circle },
            { label: 'En proceso', count: base.filter(t => t.estado === 'en_proceso').length, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', icon: Clock },
            { label: 'Resueltos', count: base.filter(t => t.estado === 'resuelto').length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
            { label: 'Cerrados', count: base.filter(t => t.estado === 'cerrado').length, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', icon: X },
          ].map(({ label, count, color, icon: Icon }) => (
            <div key={label} className="card p-4 flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'abierto', 'en_proceso', 'resuelto', 'cerrado'] as const).map(estado => (
          <button
            key={estado}
            onClick={() => setEstadoFilter(estado)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              estadoFilter === estado
                ? 'bg-brand-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {!estado ? 'Todos' : TICKET_ESTADO_LABEL[estado]}
          </button>
        ))}
      </div>

      {/* Tickets */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <HeadphonesIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay pedidos registrados</p>
          {!isAdmin && (
            <button onClick={() => setShowNuevo(true)} className="btn-primary mt-3">
              <Plus className="w-4 h-4" /> Crear primer pedido
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => {
            const emp = empleados.find(e => e.id === ticket.empleadoId)
            const isOpen = expandedId === ticket.id
            const Icon = TIPO_ICONS[ticket.tipo]
            return (
              <div key={ticket.id} className="card overflow-hidden">
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : ticket.id)}
                >
                  <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-brand-700 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{ticket.asunto}</p>
                      <span className={`badge ${TICKET_ESTADO_COLOR[ticket.estado]}`}>
                        {TICKET_ESTADO_LABEL[ticket.estado]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {TICKET_TIPO_LABEL[ticket.tipo]}
                      {isAdmin && emp ? ` · ${emp.nombre} ${emp.apellido}` : ''}
                      {' · '}{formatFecha(ticket.fechaCreacion)}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30 animate-fade-in">
                    {isAdmin && emp && (
                      <div className="flex items-center gap-2.5 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                          {emp.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emp.nombre} {emp.apellido}</p>
                          <p className="text-xs text-slate-400">{emp.cargo} · {emp.sector}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Descripción del pedido</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{ticket.descripcion}</p>
                    </div>

                    {ticket.respuesta && (
                      <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 border border-brand-100 dark:border-brand-800">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                          <p className="text-xs font-semibold text-brand-700 dark:text-brand-400">Respuesta de RRHH</p>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.respuesta}</p>
                        <p className="text-xs text-slate-400 mt-1.5">{formatFecha(ticket.fechaActualizacion)}</p>
                      </div>
                    )}

                    {/* Admin response form */}
                    {isAdmin && (ticket.estado === 'abierto' || ticket.estado === 'en_proceso') && (
                      <div className="space-y-2">
                        <label className="form-label">Responder al empleado</label>
                        <textarea
                          className="form-input resize-none"
                          rows={3}
                          placeholder="Escribí tu respuesta..."
                          value={respuesta[ticket.id] ?? ''}
                          onChange={e => setRespuesta(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <select
                            className="form-select w-auto text-sm"
                            value={estadoResp[ticket.id] ?? 'en_proceso'}
                            onChange={e => setEstadoResp(prev => ({ ...prev, [ticket.id]: e.target.value as TicketEstado }))}
                          >
                            <option value="en_proceso">Marcar En proceso</option>
                            <option value="resuelto">Marcar Resuelto</option>
                            <option value="cerrado">Cerrar ticket</option>
                          </select>
                          <button
                            onClick={() => handleResponder(ticket.id)}
                            disabled={!respuesta[ticket.id]?.trim()}
                            className="btn-primary disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" /> Responder
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

      {/* Modal nuevo pedido */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNuevo(false)}>
          <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Nuevo Pedido a RRHH</p>
              <button onClick={() => setShowNuevo(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {newError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-2.5 text-sm">
                  {newError}
                </div>
              )}
              <div>
                <label className="form-label">Tipo de pedido *</label>
                <select className="form-select" value={newForm.tipo} onChange={e => setNewForm(f => ({ ...f, tipo: e.target.value as TicketTipo }))}>
                  {TIPOS.map(t => <option key={t} value={t}>{TICKET_TIPO_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Asunto *</label>
                <input
                  className="form-input"
                  placeholder="Ej: Necesito un certificado de trabajo"
                  value={newForm.asunto}
                  onChange={e => setNewForm(f => ({ ...f, asunto: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Descripción *</label>
                <textarea
                  className="form-input resize-none"
                  rows={4}
                  placeholder="Describí en detalle tu pedido o consulta. Cuanto más detalle, más rápida la respuesta..."
                  value={newForm.descripcion}
                  onChange={e => setNewForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
                <p className="text-xs text-brand-700 dark:text-brand-400 font-medium mb-0.5">Tiempo de respuesta estimado</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">RRHH responde en un plazo de 24-48 horas hábiles. Para urgencias, comunicarse directamente al interno.</p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowNuevo(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleNuevoTicket} className="btn-primary">
                  <Send className="w-4 h-4" /> Enviar pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
