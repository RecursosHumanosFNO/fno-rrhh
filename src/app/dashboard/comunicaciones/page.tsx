'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import ImageLightbox from '@/components/ImageLightbox'
import Linkify from '@/components/Linkify'
import {
  NOVEDAD_CATEGORIA_COLOR, NOVEDAD_CATEGORIA_LABEL, NOVEDAD_CATEGORIAS,
  EVENTO_TIPO_LABEL, EVENTO_TIPO_COLOR, formatFecha,
} from '@/lib/utils'
import type { NovedadCategoria, Novedad, Evento, EventoTipo } from '@/types'

// Categorías que corresponden a tipos de evento del calendario
const EVENTO_TIPOS_SET = new Set([
  'feriado', 'jornada', 'acto', 'capacitacion', 'reunion',
  'receso', 'proyecto', 'institucional', 'reunion_padres',
  'examen', 'inscripciones', 'salida', 'religioso', 'otro',
])

type DisplayItem =
  | { kind: 'novedad'; date: string; item: Novedad }
  | { kind: 'evento'; date: string; item: Evento }
import {
  Megaphone, Plus, Pin, Calendar, PartyPopper, AlertTriangle,
  Bell, MessageSquare, X, ChevronRight, Trash2, Edit2, Save, Mail,
  Image as ImageIcon, Loader2, Paperclip, Download, ExternalLink, ChevronDown,
  Send,
} from 'lucide-react'

// Ícono por categoría (las que no estén usan Calendar por defecto)
const CATEGORIA_ICONS: Partial<Record<NovedadCategoria, React.ElementType>> = {
  comunicado: MessageSquare,
  novedad: Bell,
  alerta: AlertTriangle,
  evento: Calendar,
  cumpleanos: PartyPopper,
}
function catIcon(cat: NovedadCategoria): React.ElementType {
  return CATEGORIA_ICONS[cat] ?? Calendar
}

type NotifyChannel = 'app' | 'email'

const TIPOS_EVENTO: EventoTipo[] = [
  'jornada', 'acto', 'capacitacion', 'reunion', 'receso',
  'proyecto', 'institucional', 'reunion_padres', 'examen',
  'inscripciones', 'salida', 'religioso', 'otro',
]

const FORM_INICIAL = {
  titulo: '', contenido: '',
  categoriaRaw: 'novedad',   // string: valor del select; '__custom__' cuando es personalizada
  categoriaCustom: '',       // texto libre cuando categoriaRaw === '__custom__'
  importante: false, fijado: false,
  notifyChannels: [] as NotifyChannel[],
  destinatarios: [] as string[],   // IDs de empleados; vacío = todos
  imagen: '', adjuntoUrl: '', adjuntoNombre: '', linkUrl: '',
  addToCalendario: false,
  calendarioFecha: '',
  calendarioTipo: 'jornada' as EventoTipo,
}

export default function ComunicacionesPage() {
  const { user } = useAuth()
  const { novedades, eventos, empleados, addNovedad, updateNovedad, deleteNovedad, addEvento, forceSync } = useData()
  useEffect(() => { forceSync() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const isAdmin = user?.role === 'admin' || user?.role === 'comunicaciones'

  const [catFilter, setCatFilter] = useState<NovedadCategoria | ''>('')
  const [selectedNovedad, setSelectedNovedad] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [showPush, setShowPush] = useState(false)
  const [pushForm, setPushForm] = useState({ title: '', body: '', url: '' })
  const [pushSending, setPushSending] = useState(false)
  const [pushResult, setPushResult] = useState<string | null>(null)

  const [newForm, setNewForm] = useState(FORM_INICIAL)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const imgRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(file: File) {
    if (!supabase) return
    setUploadingImg(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `novedades/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('fno-media').upload(path, file, { upsert: false, contentType: file.type })
      if (!error) {
        const { data } = supabase.storage.from('fno-media').getPublicUrl(path)
        setNewForm(f => ({ ...f, imagen: data.publicUrl }))
      } else {
        alert('No se pudo subir la imagen: ' + error.message)
      }
    } finally {
      setUploadingImg(false)
    }
  }

  async function handleFileUpload(file: File) {
    if (!supabase) return
    if (file.size > 15 * 1024 * 1024) { alert('El archivo no puede superar los 15 MB.'); return }
    setUploadingFile(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `novedades/adjuntos/${Date.now()}_${safe}`
      const { error } = await supabase.storage.from('fno-media').upload(path, file, { upsert: false, contentType: file.type })
      if (!error) {
        const { data } = supabase.storage.from('fno-media').getPublicUrl(path)
        setNewForm(f => ({ ...f, adjuntoUrl: data.publicUrl, adjuntoNombre: file.name }))
      } else {
        alert('No se pudo subir el archivo: ' + error.message)
      }
    } finally {
      setUploadingFile(false)
    }
  }

  function toggleChannel(ch: NotifyChannel) {
    setNewForm(f => ({
      ...f,
      notifyChannels: f.notifyChannels.includes(ch)
        ? f.notifyChannels.filter(c => c !== ch)
        : [...f.notifyChannels, ch],
    }))
  }

  function toggleDestinatario(empId: string) {
    setNewForm(f => ({
      ...f,
      destinatarios: f.destinatarios.includes(empId)
        ? f.destinatarios.filter(id => id !== empId)
        : [...f.destinatarios, empId],
    }))
  }

  const empleadosActivos = empleados
    .filter(e => e.estado === 'activo')
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))

  // Visibilidad: admin/comunicaciones ven todo; un empleado solo ve las novedades
  // sin destinatarios (públicas) o donde su id esté incluido.
  const puedeVerNovedad = (n: Novedad) => {
    if (isAdmin) return true
    const dest = n.destinatarios ?? []
    return dest.length === 0 || (user?.empleadoId ? dest.includes(user.empleadoId) : false)
  }

  const filteredNovedades = novedades
    .filter(puedeVerNovedad)
    .filter(n => !catFilter || n.categoria === catFilter)
    .sort((a, b) => b.fechaPublicacion.localeCompare(a.fechaPublicacion))

  // Los eventos del calendario se muestran cuando el filtro es "" (Todas) o coincide con su tipo
  const hoy = new Date().toISOString().slice(0, 10)
  const shouldIncludeEventos = !catFilter || EVENTO_TIPOS_SET.has(catFilter)
  const filteredEventos = shouldIncludeEventos
    ? eventos.filter(e => e.fecha >= hoy && (!catFilter || e.tipo === catFilter))
    : []

  // Fijadas primero → novedades más nuevas primero → eventos más próximos al final
  const pinnedNovedades = filteredNovedades.filter(n => n.fijado)
  const unpinnedNovedades = filteredNovedades.filter(n => !n.fijado)
  const sortedEventos = [...filteredEventos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const displayItems: DisplayItem[] = [
    ...pinnedNovedades.map(n => ({ kind: 'novedad' as const, date: n.fechaPublicacion, item: n })),
    ...unpinnedNovedades.map(n => ({ kind: 'novedad' as const, date: n.fechaPublicacion, item: n })),
    ...sortedEventos.map(e => ({ kind: 'evento' as const, date: e.fecha, item: e })),
  ]

  function resolveCategoria(): NovedadCategoria {
    if (newForm.categoriaRaw === '__custom__') {
      return (newForm.categoriaCustom.trim() || 'novedad') as unknown as NovedadCategoria
    }
    return newForm.categoriaRaw as NovedadCategoria
  }

  function handlePublicar() {
    if (!newForm.titulo.trim() || !newForm.contenido.trim()) return
    if (newForm.categoriaRaw === '__custom__' && !newForm.categoriaCustom.trim()) return
    const categoriaFinal = resolveCategoria()
    if (editId) {
      updateNovedad(editId, {
        titulo: newForm.titulo,
        contenido: newForm.contenido,
        categoria: categoriaFinal,
        importante: newForm.importante,
        fijado: newForm.fijado,
        imagen: newForm.imagen || undefined,
        adjuntoUrl: newForm.adjuntoUrl || undefined,
        adjuntoNombre: newForm.adjuntoNombre || undefined,
        linkUrl: newForm.linkUrl || undefined,
        destinatarios: newForm.destinatarios,
      }, newForm.notifyChannels)
      setEditId(null)
    } else {
      addNovedad({
        titulo: newForm.titulo,
        contenido: newForm.contenido,
        categoria: categoriaFinal,
        fechaPublicacion: new Date().toISOString().slice(0, 10),
        autor: 'RRHH',
        importante: newForm.importante,
        fijado: newForm.fijado,
        imagen: newForm.imagen || undefined,
        adjuntoUrl: newForm.adjuntoUrl || undefined,
        adjuntoNombre: newForm.adjuntoNombre || undefined,
        linkUrl: newForm.linkUrl || undefined,
        destinatarios: newForm.destinatarios,
      }, newForm.notifyChannels)
      if (newForm.addToCalendario && newForm.calendarioFecha) {
        addEvento({
          titulo: newForm.titulo,
          fecha: newForm.calendarioFecha,
          tipo: newForm.calendarioTipo,
          descripcion: newForm.contenido,
          importante: newForm.importante,
          fijado: newForm.fijado,
        }, newForm.notifyChannels)
      }
    }
    setShowNueva(false)
    setNewForm(FORM_INICIAL)
  }

  function handleEdit(n: Novedad) {
    setEditId(n.id)
    setNewForm({
      titulo: n.titulo, contenido: n.contenido, categoriaRaw: n.categoria as string, categoriaCustom: '',
      importante: n.importante, fijado: n.fijado ?? false,
      notifyChannels: [],
      destinatarios: n.destinatarios ?? [],
      imagen: n.imagen ?? '', adjuntoUrl: n.adjuntoUrl ?? '', adjuntoNombre: n.adjuntoNombre ?? '', linkUrl: n.linkUrl ?? '',
      addToCalendario: false, calendarioFecha: '', calendarioTipo: 'jornada',
    })
    setShowNueva(true)
  }

  function handleCerrarModal() {
    setShowNueva(false)
    setEditId(null)
    setNewForm(FORM_INICIAL)
  }

  async function handleEnviarPush() {
    if (!pushForm.title.trim() || !pushForm.body.trim()) return
    setPushSending(true)
    setPushResult(null)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-empleado-id': user?.empleadoId ?? '' },
        body: JSON.stringify({ title: pushForm.title, body: pushForm.body, url: pushForm.url || '/dashboard' }),
      })
      const data = await res.json()
      setPushResult(`Enviado a ${data.sent} dispositivo${data.sent !== 1 ? 's' : ''}.`)
      setPushForm({ title: '', body: '', url: '' })
    } catch {
      setPushResult('Error al enviar. Intentá de nuevo.')
    } finally {
      setPushSending(false)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Comunicaciones</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Novedades y comunicados institucionales
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowPush(true)} className="btn-secondary">
              <Bell className="w-4 h-4" /> Enviar Push
            </button>
            <button onClick={() => setShowNueva(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Publicar novedad
            </button>
          </div>
        )}
      </div>

      {/* Categoría filter */}
      <div className="relative w-48">
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value as NovedadCategoria | '')}
          className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
        >
          <option value="">Todas las categorías</option>
          {NOVEDAD_CATEGORIAS.map(cat => (
            <option key={cat} value={cat}>{NOVEDAD_CATEGORIA_LABEL[cat]}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </div>

      {/* Lista unificada: novedades + eventos del calendario */}
      <div className="space-y-4">
        {displayItems.length === 0 ? (
          <div className="card p-10 text-center">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No hay novedades en esta categoría.</p>
          </div>
        ) : displayItems.map(display => {
          if (display.kind === 'evento') {
            const e = display.item
            return (
              <div key={`ev-${e.id}`} className="card p-5 transition-all hover:shadow-card-hover border-l-4 border-l-purple-400 dark:border-l-purple-500">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge ${EVENTO_TIPO_COLOR[e.tipo] ?? 'bg-purple-100 text-purple-800'}`}>
                        {EVENTO_TIPO_LABEL[e.tipo] ?? e.tipo}
                      </span>
                      <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Calendar className="w-3 h-3 mr-0.5 inline" /> Del calendario
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{e.titulo}</h3>
                    {e.imagen ? (
                      <div className="mt-3 flex flex-col sm:flex-row gap-4 items-start">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={e.imagen} alt=""
                          onClick={() => setLightbox(e.imagen!)}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-72 sm:shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
                          title="Ver imagen completa"
                        />
                        {e.descripcion && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1 min-w-0"><Linkify text={e.descripcion} /></p>
                        )}
                      </div>
                    ) : (
                      e.descripcion && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed"><Linkify text={e.descripcion} /></p>
                      )
                    )}
                    {e.adjuntoUrl && (
                      <a href={e.adjuntoUrl} target="_blank" rel="noopener noreferrer" download={e.adjuntoNombre}
                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg px-2.5 py-1.5 transition-colors w-fit">
                        <Download className="w-3.5 h-3.5" /> {e.adjuntoNombre || 'Descargar adjunto'}
                      </a>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      📅 {formatFecha(e.fecha)} · Sección Calendario
                    </p>
                  </div>
                </div>
              </div>
            )
          }

          const n = display.item
          const Icon = catIcon(n.categoria)
          const isSelected = selectedNovedad === n.id
          return (
            <div
              key={n.id}
              className={`card p-5 cursor-pointer transition-all hover:shadow-card-hover ${
                n.fijado ? 'border-l-4 border-l-amber-400 dark:border-l-amber-500' : ''
              } ${isSelected ? 'ring-2 ring-brand-500' : ''}`}
              onClick={() => setSelectedNovedad(isSelected ? null : n.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  n.categoria === 'comunicado' ? 'bg-blue-50 dark:bg-blue-900/20' :
                  n.categoria === 'alerta' ? 'bg-red-50 dark:bg-red-900/20' :
                  n.categoria === 'novedad' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                  n.categoria === 'cumpleanos' ? 'bg-pink-50 dark:bg-pink-900/20' :
                  'bg-purple-50 dark:bg-purple-900/20'
                }`}>
                  <Icon className={`w-5 h-5 ${(NOVEDAD_CATEGORIA_COLOR[n.categoria] ?? 'bg-slate-100 text-slate-600').split(' ')[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${NOVEDAD_CATEGORIA_COLOR[n.categoria] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'}`}>
                      {NOVEDAD_CATEGORIA_LABEL[n.categoria] ?? n.categoria}
                    </span>
                    {n.fijado && (
                      <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Pin className="w-3 h-3 mr-0.5" /> Fijado
                      </span>
                    )}
                    {n.importante && (
                      <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        ★ Importante
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{n.titulo}</h3>
                  {/* La imagen siempre se muestra (no se minimiza). Click = ver en grande. */}
                  {n.imagen && (
                    <div className="mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={n.imagen} alt=""
                        onClick={ev => { ev.stopPropagation(); setLightbox(n.imagen!) }}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                        title="Ver imagen completa"
                      />
                    </div>
                  )}
                  {isSelected ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed animate-fade-in"><Linkify text={n.contenido} /></p>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{n.contenido}</p>
                  )}
                  {n.adjuntoUrl && (
                    <a href={n.adjuntoUrl} target="_blank" rel="noopener noreferrer" download={n.adjuntoNombre}
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg px-2.5 py-1.5 transition-colors w-fit">
                      <Download className="w-3.5 h-3.5" /> {n.adjuntoNombre || 'Descargar adjunto'}
                    </a>
                  )}
                  {n.linkUrl && (
                    <a href={n.linkUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg px-2.5 py-1.5 transition-colors w-fit">
                      <ExternalLink className="w-3.5 h-3.5" /> Ver link
                    </a>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    Publicado el {formatFecha(n.fechaPublicacion)} · Por {n.autor}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <>
                      <button
                        onClick={ev => { ev.stopPropagation(); updateNovedad(n.id, { fijado: !n.fijado }) }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          n.fijado
                            ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        }`}
                        title={n.fijado ? 'Desfijar' : 'Fijar arriba'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={ev => { ev.stopPropagation(); handleEdit(n) }}
                        className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 text-slate-400 hover:text-sky-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={ev => {
                          ev.stopPropagation()
                          if (window.confirm(`¿Eliminar la comunicación "${n.titulo}"? Esta acción no se puede deshacer.`)) {
                            deleteNovedad(n.id)
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {!isSelected && <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal nueva / editar novedad */}
      {showNueva && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-[#eef8fc] dark:bg-slate-900 z-10">
              <p className="section-title">{editId ? 'Editar Novedad' : 'Publicar Novedad'}</p>
              <button onClick={handleCerrarModal}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Título *</label>
                <input
                  className="form-input"
                  placeholder="Título de la novedad"
                  value={newForm.titulo}
                  onChange={e => setNewForm(f => ({ ...f, titulo: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Categoría *</label>
                <select
                  className="form-select"
                  value={newForm.categoriaRaw}
                  onChange={e => setNewForm(f => ({
                    ...f,
                    categoriaRaw: e.target.value,
                    categoriaCustom: e.target.value !== '__custom__' ? '' : f.categoriaCustom,
                  }))}
                >
                  {NOVEDAD_CATEGORIAS.map(c => (
                    <option key={c} value={c}>{NOVEDAD_CATEGORIA_LABEL[c]}</option>
                  ))}
                  <option value="__custom__">✏️ Personalizada...</option>
                </select>
                {newForm.categoriaRaw === '__custom__' && (
                  <input
                    className="form-input mt-2"
                    placeholder="Escribí el nombre de la categoría"
                    value={newForm.categoriaCustom}
                    onChange={e => setNewForm(f => ({ ...f, categoriaCustom: e.target.value }))}
                  />
                )}
              </div>
              <div>
                <label className="form-label">Contenido *</label>
                <textarea
                  className="form-input resize-y min-h-[160px]"
                  rows={7}
                  placeholder="Escribí el contenido del comunicado..."
                  value={newForm.contenido}
                  onChange={e => setNewForm(f => ({ ...f, contenido: e.target.value }))}
                />
              </div>

              {/* Imagen / GIF */}
              <div>
                <label className="form-label">Imagen o GIF <span className="text-slate-400 font-normal">(opcional)</span></label>
                {newForm.imagen ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newForm.imagen} alt="" className="max-h-40 rounded-xl border border-slate-200 dark:border-slate-700" />
                    <button type="button" onClick={() => setNewForm(f => ({ ...f, imagen: '' }))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow" title="Quitar imagen">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => imgRef.current?.click()} disabled={uploadingImg}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-600 transition-colors disabled:opacity-60">
                    {uploadingImg ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><ImageIcon className="w-4 h-4" /> Subir imagen o GIF</>}
                  </button>
                )}
                <input ref={imgRef} type="file" accept="image/*,image/gif" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
              </div>

              {/* Archivo adjunto */}
              <div>
                <label className="form-label">Archivo adjunto <span className="text-slate-400 font-normal">(PDF, Word, Excel... opcional)</span></label>
                {newForm.adjuntoUrl ? (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                    <Paperclip className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{newForm.adjuntoNombre}</span>
                    <button type="button" onClick={() => setNewForm(f => ({ ...f, adjuntoUrl: '', adjuntoNombre: '' }))} className="text-slate-400 hover:text-red-500" title="Quitar adjunto">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingFile}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-600 transition-colors disabled:opacity-60">
                    {uploadingFile ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Paperclip className="w-4 h-4" /> Adjuntar archivo</>}
                  </button>
                )}
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              </div>

              {/* URL / Link externo */}
              <div>
                <label className="form-label">Link externo <span className="text-slate-400 font-normal">(opcional — YouTube, Drive, etc.)</span></label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={newForm.linkUrl}
                  onChange={e => setNewForm(f => ({ ...f, linkUrl: e.target.value }))}
                />
              </div>

              {/* Opciones */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newForm.importante}
                    onChange={e => setNewForm(f => ({ ...f, importante: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Marcar como importante (aparecerá destacado)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newForm.fijado}
                    onChange={e => setNewForm(f => ({ ...f, fijado: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-amber-500" /> Fijar arriba (siempre visible al tope)
                  </span>
                </label>
              </div>

              {/* Destinatarios: a quién le llega / quién la ve */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Destinatarios</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {newForm.destinatarios.length === 0
                      ? 'Sin marcar = todos los empleados activos'
                      : `${newForm.destinatarios.length} empleado(s) seleccionado(s)`}
                  </p>
                </div>
                <div className="p-2">
                  {newForm.destinatarios.length > 0 && (
                    <button type="button"
                      onClick={() => setNewForm(f => ({ ...f, destinatarios: [] }))}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline px-2 py-1">
                      Limpiar selección (enviar a todos)
                    </button>
                  )}
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {empleadosActivos.map(e => (
                      <label key={e.id} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <input type="checkbox" checked={newForm.destinatarios.includes(e.id)}
                          onChange={() => toggleDestinatario(e.id)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{e.nombre} {e.apellido}</span>
                        {e.sector && <span className="text-xs text-slate-400">· {e.sector}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Canales de notificación (al crear y al editar: reenvía el aviso) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {editId ? 'Reenviar aviso al guardar' : 'Notificaciones al publicar'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editId
                      ? 'Marcá si querés volver a avisar a los destinatarios con los cambios'
                      : 'Elegí cómo avisar a los destinatarios (podés marcar más de uno)'}
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <input type="checkbox" checked={newForm.notifyChannels.includes('app')}
                      onChange={() => toggleChannel('app')}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Notificación en la app</p>
                        <p className="text-xs text-slate-400">Aparece en el ícono de campana del portal</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <input type="checkbox" checked={newForm.notifyChannels.includes('email')}
                      onChange={() => toggleChannel('email')}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Notificar por email</p>
                        <p className="text-xs text-slate-400">Envía el aviso por correo a los destinatarios</p>
                      </div>
                    </div>
                  </label>
                  {newForm.notifyChannels.length === 0 && (
                    <p className="text-xs text-slate-400 px-2 italic">
                      {editId ? 'Sin reenvío — solo se guardan los cambios.' : 'Sin aviso — la novedad se publica pero no se notifica.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Cross-post al calendario (solo al crear) */}
              {!editId && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-slate-200 dark:border-slate-700">
                    <input type="checkbox" checked={newForm.addToCalendario}
                      onChange={e => setNewForm(f => ({ ...f, addToCalendario: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400" />
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Agregar al calendario institucional</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">También aparecerá en Calendario</p>
                      </div>
                    </div>
                  </label>
                  {newForm.addToCalendario && (
                    <div className="p-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">Fecha del evento *</label>
                        <input type="date" className="form-input" value={newForm.calendarioFecha}
                          onChange={e => setNewForm(f => ({ ...f, calendarioFecha: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label">Tipo de evento</label>
                        <select className="form-select" value={newForm.calendarioTipo}
                          onChange={e => setNewForm(f => ({ ...f, calendarioTipo: e.target.value as EventoTipo }))}>
                          {TIPOS_EVENTO.map(t => <option key={t} value={t}>{EVENTO_TIPO_LABEL[t]}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={handleCerrarModal} className="btn-secondary">Cancelar</button>
                <button onClick={handlePublicar}
                  disabled={!newForm.titulo.trim() || !newForm.contenido.trim() || (newForm.addToCalendario && !newForm.calendarioFecha)}
                  className="btn-primary disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {editId ? 'Guardar cambios' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visor de imagen */}
      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* Modal enviar push */}
      {showPush && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#23597e]" />
                <p className="font-semibold text-slate-800 dark:text-slate-100">Enviar notificación push</p>
              </div>
              <button onClick={() => { setShowPush(false); setPushResult(null) }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              La notificación llegará a todos los dispositivos que tengan activadas las notificaciones push.
            </p>
            <div className="space-y-3">
              <div>
                <label className="form-label">Título *</label>
                <input
                  className="form-input"
                  placeholder="Ej: Recordatorio importante"
                  value={pushForm.title}
                  onChange={e => setPushForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Mensaje *</label>
                <textarea
                  className="form-input resize-none"
                  rows={3}
                  placeholder="Ej: Recordá completar tu perfil antes del viernes."
                  value={pushForm.body}
                  onChange={e => setPushForm(f => ({ ...f, body: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">URL destino (opcional)</label>
                <input
                  className="form-input"
                  placeholder="/dashboard (por defecto)"
                  value={pushForm.url}
                  onChange={e => setPushForm(f => ({ ...f, url: e.target.value }))}
                />
              </div>
            </div>
            {pushResult && (
              <p className={`text-sm font-medium ${pushResult.startsWith('Error') ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {pushResult}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowPush(false); setPushResult(null) }} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleEnviarPush}
                disabled={pushSending || !pushForm.title.trim() || !pushForm.body.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {pushSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {pushSending ? 'Enviando...' : 'Enviar a todos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
