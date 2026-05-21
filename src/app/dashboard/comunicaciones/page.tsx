'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { novedades, eventos, empleados } from '@/lib/mockData'
import {
  NOVEDAD_CATEGORIA_COLOR, NOVEDAD_CATEGORIA_LABEL, formatFecha,
} from '@/lib/utils'
import type { NovedadCategoria } from '@/types'
import {
  Megaphone, Plus, Pin, Calendar, PartyPopper, AlertTriangle,
  Bell, MessageSquare, X, ChevronRight, Info, Zap,
} from 'lucide-react'

const CATEGORIA_ICONS: Record<NovedadCategoria, React.ElementType> = {
  comunicado: MessageSquare,
  novedad: Bell,
  alerta: AlertTriangle,
  evento: Calendar,
  cumpleanos: PartyPopper,
}

export default function ComunicacionesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [catFilter, setCatFilter] = useState<NovedadCategoria | ''>('')
  const [selectedNovedad, setSelectedNovedad] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [activeTab, setActiveTab] = useState<'novedades' | 'calendario'>('novedades')

  const filtered = novedades.filter(n => !catFilter || n.categoria === catFilter)
    .sort((a, b) => new Date(b.fechaPublicacion).getTime() - new Date(a.fechaPublicacion).getTime())

  const novedad = novedades.find(n => n.id === selectedNovedad)

  const hoy = new Date()
  const eventosFuturos = eventos.filter(e => new Date(e.fecha) >= hoy)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Comunicaciones</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Novedades institucionales y calendario de eventos
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNueva(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Publicar novedad
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(['novedades', 'calendario'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === t
                ? 'border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t === 'novedades' ? 'Novedades' : 'Calendario de Eventos'}
          </button>
        ))}
      </div>

      {activeTab === 'novedades' && (
        <>
          {/* Categoría filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCatFilter('')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !catFilter ? 'bg-brand-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas
            </button>
            {(['comunicado', 'novedad', 'alerta', 'evento', 'cumpleanos'] as NovedadCategoria[]).map(cat => {
              const Icon = CATEGORIA_ICONS[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    catFilter === cat ? 'bg-brand-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {NOVEDAD_CATEGORIA_LABEL[cat]}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Novedades list */}
            <div className="lg:col-span-2 space-y-4">
              {filtered.length === 0 ? (
                <div className="card p-10 text-center">
                  <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No hay novedades en esta categoría.</p>
                </div>
              ) : filtered.map(n => {
                const Icon = CATEGORIA_ICONS[n.categoria]
                const isSelected = selectedNovedad === n.id
                return (
                  <div
                    key={n.id}
                    className={`card p-5 cursor-pointer transition-all hover:shadow-card-hover ${isSelected ? 'ring-2 ring-brand-500' : ''}`}
                    onClick={() => setSelectedNovedad(isSelected ? null : n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${NOVEDAD_CATEGORIA_COLOR[n.categoria].replace('text-', 'bg-').split(' ')[0].replace('bg-', 'bg-').replace('100', '50')} `}
                        style={{ background: 'var(--icon-bg)' }}>
                        <Icon className={`w-5 h-5 ${NOVEDAD_CATEGORIA_COLOR[n.categoria].split(' ')[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`badge ${NOVEDAD_CATEGORIA_COLOR[n.categoria]}`}>
                            {NOVEDAD_CATEGORIA_LABEL[n.categoria]}
                          </span>
                          {n.importante && (
                            <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <Pin className="w-3 h-3" /> Importante
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{n.titulo}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{n.contenido}</p>
                        {isSelected && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed animate-fade-in">
                            {n.contenido}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          Publicado el {formatFecha(n.fechaPublicacion)} · Por {n.autor}
                        </p>
                      </div>
                      {!isSelected ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : null}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Aside: próximos eventos y cumpleaños */}
            <div className="space-y-6">
              {/* Próximos eventos */}
              <div className="card p-5">
                <p className="section-title text-base mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-700 dark:text-brand-400" /> Próximos eventos
                </p>
                <div className="space-y-3">
                  {eventosFuturos.slice(0, 5).map(ev => (
                    <div key={ev.id} className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        ev.tipo === 'cumpleanos' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' :
                        ev.tipo === 'evento' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' :
                        ev.tipo === 'vencimiento' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                        'bg-blue-50 dark:bg-blue-900/20 text-brand-700 dark:text-brand-400'
                      }`}>
                        {ev.tipo === 'cumpleanos' ? <PartyPopper className="w-4 h-4" /> :
                         ev.tipo === 'vencimiento' ? <AlertTriangle className="w-4 h-4" /> :
                         ev.tipo === 'feriado' ? <Zap className="w-4 h-4" /> :
                         <Calendar className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{ev.titulo}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatFecha(ev.fecha)}</p>
                        {ev.descripcion && <p className="text-xs text-slate-400">{ev.descripcion}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cumpleaños del mes */}
              <div className="card p-5">
                <p className="section-title text-base mb-4 flex items-center gap-2">
                  <PartyPopper className="w-4 h-4 text-pink-500" /> Cumpleaños del mes
                </p>
                <div className="space-y-2.5">
                  {empleados.filter(e => {
                    const mes = parseInt(e.fechaNacimiento.split('-')[1])
                    return mes === new Date().getMonth() + 1
                  }).map(e => (
                    <div key={e.id} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-xs font-bold">
                        {e.nombre.charAt(0)}{e.apellido.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{e.nombre} {e.apellido}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(e.fechaNacimiento).getDate()}/{new Date().getMonth() + 1}
                        </p>
                      </div>
                    </div>
                  ))}
                  {empleados.filter(e => parseInt(e.fechaNacimiento.split('-')[1]) === new Date().getMonth() + 1).length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-2">Sin cumpleaños este mes</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'calendario' && (
        <div className="card p-5">
          <p className="section-title mb-5 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Calendario de Eventos — Mayo / Junio 2026
          </p>
          <div className="space-y-3">
            {eventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()).map(ev => {
              const emp = ev.empleadoId ? empleados.find(e => e.id === ev.empleadoId) : null
              return (
                <div key={ev.id} className={`flex items-start gap-4 p-4 rounded-xl border ${
                  ev.tipo === 'cumpleanos' ? 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-900/10' :
                  ev.tipo === 'vencimiento' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' :
                  ev.tipo === 'feriado' ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10' :
                  'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10'
                }`}>
                  <div className="text-center shrink-0 w-12">
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {new Date(ev.fecha).getDate()}
                    </p>
                    <p className="text-xs text-slate-500 uppercase">
                      {new Date(ev.fecha).toLocaleDateString('es-AR', { month: 'short' })}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{ev.titulo}</p>
                    {ev.descripcion && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{ev.descripcion}</p>}
                    {emp && <p className="text-xs text-slate-400 mt-0.5">{emp.sector}</p>}
                  </div>
                  <span className={`badge text-xs ${
                    ev.tipo === 'cumpleanos' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                    ev.tipo === 'vencimiento' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    ev.tipo === 'feriado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}>
                    {ev.tipo === 'cumpleanos' ? 'Cumpleaños' : ev.tipo === 'vencimiento' ? 'Vencimiento' : ev.tipo === 'feriado' ? 'Feriado' : 'Evento'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Nueva novedad modal */}
      {showNueva && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNueva(false)}>
          <div className="card w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Publicar Novedad</p>
              <button onClick={() => setShowNueva(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="form-label">Título *</label><input className="form-input" placeholder="Título de la novedad" /></div>
              <div>
                <label className="form-label">Categoría *</label>
                <select className="form-select">
                  {(['comunicado', 'novedad', 'alerta', 'evento', 'cumpleanos'] as NovedadCategoria[]).map(c => (
                    <option key={c} value={c}>{NOVEDAD_CATEGORIA_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              <div><label className="form-label">Contenido *</label><textarea className="form-input resize-none" rows={4} placeholder="Escribí el contenido del comunicado..." /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Marcar como importante</span>
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNueva(false)} className="btn-secondary">Cancelar</button>
                <button className="btn-primary">Publicar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
