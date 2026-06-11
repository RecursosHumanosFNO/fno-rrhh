'use client'

import { useState, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { parseLocalDate, EVENTO_TIPO_LABEL, EVENTO_TIPO_COLOR, EVENTO_TIPO_DOT, formatFecha } from '@/lib/utils'
import type { EventoTipo, Evento, NovedadCategoria } from '@/types'
import {
  Calendar, PartyPopper, Plus, ChevronLeft, ChevronRight,
  Edit2, Trash2, X, Save, Image as ImageIcon, Loader2,
  Paperclip, Download, Pin, Bell, Mail, Lock, Users, Megaphone,
} from 'lucide-react'

type NotifyChannel = 'app' | 'email'
type EventoForm = Omit<Evento, 'id'> & {
  notifyChannels: NotifyChannel[]
  addToComunicaciones: boolean
}

const TIPOS_EVENTO: EventoTipo[] = ['feriado', 'jornada', 'acto', 'capacitacion', 'reunion', 'receso', 'proyecto', 'institucional', 'reunion_padres', 'examen', 'inscripciones', 'salida', 'religioso', 'otro']

// Fondo de celda del calendario (más saturado que el badge para que se vea bien)
const EVENTO_TIPO_CELL_BG: Record<EventoTipo, string> = {
  feriado:       'bg-blue-200 dark:bg-blue-900/60',
  jornada:       'bg-purple-200 dark:bg-purple-900/60',
  acto:          'bg-amber-200 dark:bg-amber-900/60',
  capacitacion:  'bg-emerald-200 dark:bg-emerald-900/60',
  reunion:       'bg-orange-200 dark:bg-orange-900/60',
  receso:        'bg-cyan-200 dark:bg-cyan-900/60',
  proyecto:      'bg-green-200 dark:bg-green-900/60',
  institucional: 'bg-indigo-200 dark:bg-indigo-900/60',
  reunion_padres:'bg-rose-200 dark:bg-rose-900/60',
  examen:        'bg-red-200 dark:bg-red-900/60',
  inscripciones: 'bg-teal-200 dark:bg-teal-900/60',
  salida:        'bg-lime-200 dark:bg-lime-900/60',
  religioso:     'bg-violet-200 dark:bg-violet-900/60',
  otro:          'bg-slate-200 dark:bg-slate-700/80',
}

const PORTAL_LAUNCH = '2026-06-09'
const PORTAL_LAUNCH_YEAR = 2026
const ANIVERSARIO_ID = '__aniversario_portal__'

function makeAniversario(year: number): Evento {
  const years = year - PORTAL_LAUNCH_YEAR
  const titulo = years <= 0
    ? '🎉 ¡Lanzamiento del Portal RRHH!'
    : `🎉 ${years} ${years === 1 ? 'año' : 'años'} del Portal RRHH`
  const descripcion = years <= 0
    ? '¡Hoy ponemos en marcha el Portal de Empleados de la Fundación Neuquén Oeste!'
    : `¡Hace ${years} ${years === 1 ? 'año' : 'años'} lanzamos el Portal RRHH! Gracias al equipo por acompañarnos.`
  return { id: ANIVERSARIO_ID, titulo, fecha: `${year}-06-09`, tipo: 'institucional', descripcion }
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_NOMBRE = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function emptyForm(): EventoForm {
  return {
    titulo: '', fecha: '', tipo: 'jornada', descripcion: '',
    importante: false, fijado: false, destinatarios: [],
    notifyChannels: [], addToComunicaciones: false,
  }
}

export default function EventosPage() {
  const { user, empleado } = useAuth()
  const { empleados, eventos, addEvento, updateEvento, deleteEvento, addNovedad } = useData()
  const isAdmin = user?.role === 'admin' || user?.role === 'comunicaciones'

  const hoy = new Date()
  const [viewAnio, setViewAnio] = useState(hoy.getFullYear())
  const [viewMes, setViewMes] = useState(hoy.getMonth()) // 0-based

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; evento?: Evento; fechaDefault?: string } | null>(null)
  const [form, setForm] = useState<EventoForm>(emptyForm())
  const [destSearch, setDestSearch] = useState('')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(file: File) {
    if (!supabase) return
    setUploadingImg(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `eventos/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('fno-media').upload(path, file, { upsert: false, contentType: file.type })
      if (!error) {
        const { data } = supabase.storage.from('fno-media').getPublicUrl(path)
        setForm(f => ({ ...f, imagen: data.publicUrl }))
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
      const path = `eventos/adjuntos/${Date.now()}_${safe}`
      const { error } = await supabase.storage.from('fno-media').upload(path, file, { upsert: false, contentType: file.type })
      if (!error) {
        const { data } = supabase.storage.from('fno-media').getPublicUrl(path)
        setForm(f => ({ ...f, adjuntoUrl: data.publicUrl, adjuntoNombre: file.name }))
      } else {
        alert('No se pudo subir el archivo: ' + error.message)
      }
    } finally {
      setUploadingFile(false)
    }
  }

  // ── Eventos visibles según destinatarios ─────────────────────────────────
  const eventosVisibles = useMemo(() => {
    return eventos.filter(ev => {
      if (!ev.destinatarios || ev.destinatarios.length === 0) return true
      if (isAdmin) return true
      return ev.destinatarios.includes(empleado?.id ?? '')
    })
  }, [eventos, isAdmin, empleado?.id])

  // ── Cumpleaños del mes actual ─────────────────────────────────────────────
  const cumpleaniosMes = useMemo(() => empleados.filter(e => {
    if (!e.fechaNacimiento) return false
    const nac = parseLocalDate(e.fechaNacimiento)
    return nac.getMonth() === viewMes
  }).sort((a, b) => {
    const da = parseLocalDate(a.fechaNacimiento).getDate()
    const db = parseLocalDate(b.fechaNacimiento).getDate()
    return da - db
  }), [empleados, viewMes])

  // ── Aniversario del portal (virtual, recurrente cada 9 de junio) ─────────
  const aniversarioPortal = useMemo(() => makeAniversario(viewAnio), [viewAnio])

  // ── Eventos del mes visible (incluyendo aniversario si es junio) ──────────
  const eventosMes = useMemo(() => {
    const base = eventosVisibles.filter(ev => {
      const f = parseLocalDate(ev.fecha)
      return f.getFullYear() === viewAnio && f.getMonth() === viewMes
    })
    return viewMes === 5 ? [...base, aniversarioPortal] : base
  }, [eventosVisibles, viewAnio, viewMes, aniversarioPortal])

  // ── Eventos del día seleccionado ──────────────────────────────────────────
  const eventosDia = useMemo(() => {
    if (!selectedDay) return []
    const base = eventosVisibles.filter(ev => ev.fecha === selectedDay)
    return selectedDay === `${viewAnio}-06-09` ? [...base, aniversarioPortal] : base
  }, [eventosVisibles, selectedDay, viewAnio, aniversarioPortal])

  // ── Navegar meses ─────────────────────────────────────────────────────────
  function prevMes() {
    if (viewMes === 0) { setViewMes(11); setViewAnio(y => y - 1) }
    else setViewMes(m => m - 1)
    setSelectedDay(null)
  }
  function nextMes() {
    if (viewMes === 11) { setViewMes(0); setViewAnio(y => y + 1) }
    else setViewMes(m => m + 1)
    setSelectedDay(null)
  }

  // ── Abrir modal ───────────────────────────────────────────────────────────
  function openAdd(fechaDefault?: string) {
    setForm({ ...emptyForm(), fecha: fechaDefault ?? '' })
    setDestSearch('')
    setModal({ mode: 'add', fechaDefault })
  }
  function openEdit(ev: Evento) {
    setForm({
      titulo: ev.titulo, fecha: ev.fecha, tipo: ev.tipo,
      descripcion: ev.descripcion ?? '', imagen: ev.imagen,
      adjuntoUrl: ev.adjuntoUrl, adjuntoNombre: ev.adjuntoNombre,
      importante: ev.importante ?? false, fijado: ev.fijado ?? false,
      destinatarios: ev.destinatarios ?? [],
      notifyChannels: [], addToComunicaciones: false,
    })
    setDestSearch('')
    setModal({ mode: 'edit', evento: ev })
  }

  function toggleDest(id: string) {
    setForm(f => ({
      ...f,
      destinatarios: (f.destinatarios ?? []).includes(id)
        ? (f.destinatarios ?? []).filter(d => d !== id)
        : [...(f.destinatarios ?? []), id],
    }))
  }

  function toggleNotify(ch: NotifyChannel) {
    setForm(f => ({
      ...f,
      notifyChannels: f.notifyChannels.includes(ch)
        ? f.notifyChannels.filter(c => c !== ch)
        : [...f.notifyChannels, ch],
    }))
  }

  function handleSave() {
    if (!form.titulo.trim() || !form.fecha) return
    const { notifyChannels, addToComunicaciones, ...eventoData } = form
    if (modal?.mode === 'edit' && modal.evento) {
      updateEvento(modal.evento.id, eventoData)
    } else {
      addEvento(eventoData, notifyChannels)
    }
    if (addToComunicaciones) {
      addNovedad({
        titulo: form.titulo,
        contenido: form.descripcion ?? '',
        categoria: 'evento' as NovedadCategoria,
        fechaPublicacion: new Date().toISOString().slice(0, 10),
        autor: 'RRHH',
        importante: form.importante ?? false,
        fijado: form.fijado ?? false,
      }, notifyChannels)
    }
    setModal(null)
  }

  function handleDelete(id: string) {
    deleteEvento(id)
    setConfirmDelete(null)
    setSelectedDay(null)
  }

  // ── Construir grilla del mes ──────────────────────────────────────────────
  const primerDia = new Date(viewAnio, viewMes, 1).getDay() // 0=Dom
  const diasEnMes = new Date(viewAnio, viewMes + 1, 0).getDate()
  const celdas: (number | null)[] = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]
  // Rellenar hasta múltiplo de 7
  while (celdas.length % 7 !== 0) celdas.push(null)

  // Map de día → eventos (sin cumpleaños, se renderizan por separado)
  const eventosPorDia = useMemo(() => {
    const map: Record<number, { tipo: EventoTipo; titulo: string }[]> = {}
    eventosMes.forEach(ev => {
      const d = parseLocalDate(ev.fecha).getDate()
      if (!map[d]) map[d] = []
      map[d].push({ tipo: ev.tipo, titulo: ev.titulo })
    })
    return map
  }, [eventosMes])

  // Map de día → cantidad de cumpleaños
  const cumplesPorDia = useMemo(() => {
    const map: Record<number, number> = {}
    cumpleaniosMes.forEach(emp => {
      const d = parseLocalDate(emp.fechaNacimiento).getDate()
      map[d] = (map[d] ?? 0) + 1
    })
    return map
  }, [cumpleaniosMes])

  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Calendario</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Calendario institucional, actos escolares y cumpleaños del equipo
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => openAdd()} className="btn-primary">
            <Plus className="w-4 h-4" /> Agregar evento
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Columna principal: calendario ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Calendario mensual */}
          <div className="card p-5">
            {/* Header del mes */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMes} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {MESES_NOMBRE[viewMes]} {viewAnio}
              </h2>
              <button onClick={nextMes} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 mb-2">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">{d}</div>
              ))}
            </div>

            {/* Celdas del calendario */}
            <div className="grid grid-cols-7 gap-0.5">
              {celdas.map((dia, i) => {
                if (dia === null) {
                  return <div key={`empty-${i}`} className="aspect-square" />
                }
                const fechaStr = `${viewAnio}-${String(viewMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const evs = eventosPorDia[dia] ?? []
                const cumpleCount = cumplesPorDia[dia] ?? 0
                const esHoy = fechaStr === hoyStr
                const esSelected = fechaStr === selectedDay
                const esFinDeSemana = [0, 6].includes((primerDia + (dia - 1)) % 7)
                const tienePuntos = evs.length > 0 || cumpleCount > 0

                // Color de celda: selected > evento > cumpleaños > hoy > default
                const cellBg = esSelected
                  ? 'bg-brand-700 shadow-md'
                  : evs.length > 0
                  ? EVENTO_TIPO_CELL_BG[evs[0].tipo]
                  : cumpleCount > 0
                  ? 'bg-pink-200 dark:bg-pink-900/60'
                  : esHoy
                  ? 'bg-sky-100 dark:bg-sky-900/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'

                return (
                  <button
                    key={fechaStr}
                    onClick={() => setSelectedDay(esSelected ? null : fechaStr)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative cursor-pointer ${cellBg}`}
                  >
                    {/* Número del día — círculo azul si es hoy */}
                    <span className={`font-semibold text-sm flex items-center justify-center
                      ${esHoy && !esSelected
                        ? 'w-6 h-6 rounded-full bg-sky-500 text-white'
                        : esSelected
                        ? 'text-white'
                        : evs.length > 0 || cumpleCount > 0
                        ? 'text-slate-900 dark:text-white'
                        : esFinDeSemana
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-700 dark:text-slate-200'
                      }
                    `}>
                      {dia}
                    </span>

                    {/* Indicador de cumpleaños cuando la celda ya tiene color de evento */}
                    {cumpleCount > 0 && evs.length > 0 && !esSelected && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500 border border-white dark:border-slate-900" />
                    )}

                    {/* Cantidad de eventos si hay más de uno */}
                    {evs.length > 1 && !esSelected && (
                      <span className="text-[9px] leading-none mt-0.5 opacity-60 text-slate-700 dark:text-white">
                        {evs.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {TIPOS_EVENTO.map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${EVENTO_TIPO_CELL_BG[t]}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {EVENTO_TIPO_LABEL[t].replace(/^\S+\s/, '')}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-pink-200 dark:bg-pink-900/60" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Cumpleaños</span>
              </div>
            </div>
          </div>

          {/* Próximos eventos (30 días) */}
          <div className="card p-5">
            <p className="section-title text-base mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Próximos 30 días
            </p>
            {(() => {
              const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
              const hasta = new Date(desde.getTime() + 30 * 24 * 60 * 60 * 1000)
              const anivActual = makeAniversario(hoy.getFullYear())
              const proximos = [...eventosVisibles, anivActual].filter(ev => {
                const f = parseLocalDate(ev.fecha)
                return f >= desde && f <= hasta
              }).sort((a, b) => a.fecha.localeCompare(b.fecha))

              if (proximos.length === 0) return (
                <p className="text-slate-400 text-sm text-center py-4">Sin eventos en los próximos 30 días</p>
              )
              return (
                <div className="space-y-3">
                  {proximos.slice(0, 8).map(ev => {
                    const f = parseLocalDate(ev.fecha)
                    const diff = Math.round((f.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={ev.id} className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${EVENTO_TIPO_COLOR[ev.tipo]}`}>
                          {diff === 0 ? 'HOY' : `${diff}d`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{ev.titulo}</p>
                          <p className="text-xs text-slate-400">{formatFecha(ev.fecha)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Lista completa del mes */}
          {(eventosMes.length > 0 || cumpleaniosMes.length > 0) && (
            <div className="card p-5">
              <p className="section-title mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Eventos de {MESES_NOMBRE[viewMes]}
              </p>
              <div className="space-y-2">
                {[
                  ...eventosMes.map(ev => ({
                    fecha: ev.fecha,
                    content: (
                      <div key={ev.id} className="flex items-start gap-3">
                        <div className="text-center shrink-0 w-10">
                          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                            {parseLocalDate(ev.fecha).getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ev.titulo}</p>
                          {ev.descripcion && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ev.descripcion}</p>}
                        </div>
                        <span className={`badge text-xs shrink-0 ${EVENTO_TIPO_COLOR[ev.tipo]}`}>
                          {EVENTO_TIPO_LABEL[ev.tipo]}
                        </span>
                        {isAdmin && ev.id !== ANIVERSARIO_ID && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEdit(ev)} className="p-1.5 rounded hover:bg-sky-100 dark:hover:bg-sky-900/20 text-slate-400 hover:text-sky-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmDelete(ev.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ),
                  })),
                ].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((item, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {item.content}
                  </div>
                ))}

                {cumpleaniosMes.map(e => {
                  const d = String(parseLocalDate(e.fechaNacimiento).getDate()).padStart(2, '0')
                  return (
                    <div key={`c${e.id}`} className="p-3 rounded-xl border border-pink-100 dark:border-pink-900/20 bg-pink-50/50 dark:bg-pink-900/10">
                      <div className="flex items-center gap-3">
                        <div className="text-center shrink-0 w-10">
                          <p className="text-base font-bold text-pink-600 dark:text-pink-400">{parseInt(d)}</p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 text-xs font-bold overflow-hidden shrink-0">
                          {e.foto ? <img src={e.foto} alt="" className="w-7 h-7 object-cover" /> : `${e.nombre.charAt(0)}${e.apellido.charAt(0)}`}
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">
                          🎂 Cumpleaños de {e.nombre} {e.apellido}
                        </p>
                        <span className="badge text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">Cumpleaños</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Panel de día seleccionado */}
          {selectedDay && (
            <div className="card p-5 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatFecha(selectedDay)}
                </p>
                <div className="flex gap-2">
                  {isAdmin && (
                    <button onClick={() => openAdd(selectedDay)} className="btn-primary text-sm py-1.5">
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  )}
                  <button onClick={() => setSelectedDay(null)} className="btn-secondary text-sm py-1.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Eventos del día */}
              {eventosDia.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  Sin eventos institucionales este día.
                  {isAdmin && <span className="block text-xs mt-1">Podés agregar uno con el botón de arriba.</span>}
                </p>
              ) : (
                <div className="space-y-2">
                  {eventosDia.map(ev => (
                    <div key={ev.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`badge text-xs ${EVENTO_TIPO_COLOR[ev.tipo]}`}>
                          {EVENTO_TIPO_LABEL[ev.tipo]}
                        </span>
                        {isAdmin && ev.id !== ANIVERSARIO_ID && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/20 text-slate-400 hover:text-sky-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmDelete(ev.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ev.titulo}</p>
                      {ev.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{ev.descripcion}</p>}
                      {ev.imagen && <img src={ev.imagen} alt="" className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 w-full max-h-56 object-cover" />}
                      {ev.adjuntoUrl && (
                        <a href={ev.adjuntoUrl} target="_blank" rel="noopener noreferrer" download={ev.adjuntoNombre}
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg px-2.5 py-1.5 transition-colors w-fit">
                          <Download className="w-3.5 h-3.5" /> {ev.adjuntoNombre || 'Descargar adjunto'}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Cumpleaños del día */}
              {(() => {
                const [, , d] = selectedDay.split('-').map(Number)
                const cumples = empleados.filter(e => {
                  if (!e.fechaNacimiento) return false
                  const nac = parseLocalDate(e.fechaNacimiento)
                  return nac.getMonth() === viewMes && nac.getDate() === d
                })
                if (cumples.length === 0) return null
                return (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {cumples.map(e => (
                      <div key={e.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20">
                        <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 text-xs font-bold overflow-hidden shrink-0">
                          {e.foto ? <img src={e.foto} alt="" className="w-8 h-8 object-cover" /> : `${e.nombre.charAt(0)}${e.apellido.charAt(0)}`}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">🎂 Cumpleaños de {e.nombre} {e.apellido}</p>
                          <p className="text-xs text-slate-400">{e.cargo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Cumpleaños del mes */}
          <div className="card p-5">
            <p className="section-title text-base mb-4 flex items-center gap-2">
              <PartyPopper className="w-4 h-4 text-pink-500" /> Cumpleaños de {MESES_NOMBRE[viewMes]}
            </p>
            {cumpleaniosMes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Sin cumpleaños este mes</p>
            ) : (
              <div className="space-y-3">
                {cumpleaniosMes.map(e => {
                  const nac = parseLocalDate(e.fechaNacimiento)
                  const esHoyBirth = nac.getDate() === hoy.getDate() && viewMes === hoy.getMonth()
                  return (
                    <div key={e.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${esHoyBirth ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                      <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 text-xs font-bold overflow-hidden shrink-0">
                        {e.foto ? <img src={e.foto} alt="" className="w-9 h-9 object-cover" /> : `${e.nombre.charAt(0)}${e.apellido.charAt(0)}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{e.nombre} {e.apellido}</p>
                        <p className="text-xs text-slate-400">{nac.getDate()}/{viewMes + 1} · {e.cargo}</p>
                      </div>
                      {esHoyBirth && <span className="text-lg shrink-0">🎂</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal agregar/editar evento ──────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="card w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-[#eef8fc] dark:bg-slate-900 z-10">
              <p className="section-title">
                {modal.mode === 'edit' ? 'Editar evento' : 'Nuevo evento'}
              </p>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Título */}
              <div>
                <label className="form-label">Título *</label>
                <input className="form-input" placeholder="Ej: Acto por el Día de la Bandera"
                  value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} autoFocus />
              </div>
              {/* Fecha + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Fecha *</label>
                  <input className="form-input" type="date" value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Tipo *</label>
                  <select className="form-select" value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as EventoTipo }))}>
                    {TIPOS_EVENTO.map(t => <option key={t} value={t}>{EVENTO_TIPO_LABEL[t]}</option>)}
                  </select>
                </div>
              </div>
              {/* Descripción */}
              <div>
                <label className="form-label">Descripción (opcional)</label>
                <textarea className="form-input resize-none" rows={3} placeholder="Detalles adicionales..."
                  value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>

              {/* Imagen */}
              <div>
                <label className="form-label">Imagen o GIF <span className="text-slate-400 font-normal">(opcional)</span></label>
                {form.imagen ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imagen} alt="" className="max-h-40 rounded-xl border border-slate-200 dark:border-slate-700" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, imagen: undefined }))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"><X className="w-3.5 h-3.5" /></button>
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

              {/* Adjunto */}
              <div>
                <label className="form-label">Archivo adjunto <span className="text-slate-400 font-normal">(PDF, Word, Excel... opcional)</span></label>
                {form.adjuntoUrl ? (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                    <Paperclip className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{form.adjuntoNombre}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, adjuntoUrl: undefined, adjuntoNombre: undefined }))} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
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

              {/* Opciones: importante + fijado */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.importante ?? false}
                    onChange={e => setForm(f => ({ ...f, importante: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Marcar como importante</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.fijado ?? false}
                    onChange={e => setForm(f => ({ ...f, fijado: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-amber-500" /> Fijar en Comunicaciones
                  </span>
                </label>
              </div>

              {/* Destinatarios (privado) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Visibilidad</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Sin selección = visible para todos los empleados</p>
                </div>
                <div className="p-3 space-y-2">
                  {(form.destinatarios ?? []).length > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Evento privado — solo {(form.destinatarios ?? []).length} {(form.destinatarios ?? []).length === 1 ? 'persona' : 'personas'}
                      </span>
                      <button type="button" onClick={() => setForm(f => ({ ...f, destinatarios: [] }))}
                        className="ml-auto text-xs text-slate-400 hover:text-red-500 underline">Limpiar</button>
                    </div>
                  )}
                  <input type="text" placeholder="Buscar empleado..." value={destSearch}
                    onChange={e => setDestSearch(e.target.value)}
                    className="form-input py-1.5 text-sm" />
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {empleados
                      .filter(e => e.estado !== 'inactivo')
                      .filter(e => destSearch === '' || `${e.nombre} ${e.apellido}`.toLowerCase().includes(destSearch.toLowerCase()))
                      .map(e => (
                        <label key={e.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                          <input type="checkbox"
                            checked={(form.destinatarios ?? []).includes(e.id)}
                            onChange={() => toggleDest(e.id)}
                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                            {e.foto ? <img src={e.foto} alt="" className="w-6 h-6 object-cover" /> : `${e.nombre[0]}${e.apellido[0]}`}
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-200">{e.nombre} {e.apellido}</span>
                          <span className="text-xs text-slate-400 ml-auto">{e.cargo}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>

              {/* Notificaciones */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Notificaciones al guardar</p>
                  <p className="text-xs text-slate-400 mt-0.5">Podés marcar más de una</p>
                </div>
                <div className="p-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <input type="checkbox" checked={form.notifyChannels.includes('app')}
                      onChange={() => toggleNotify('app')}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Notificación en la app</p>
                      <p className="text-xs text-slate-400">Aparece en el ícono de campana del portal</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <input type="checkbox" checked={form.notifyChannels.includes('email')}
                      onChange={() => toggleNotify('email')}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Notificar por email</p>
                      <p className="text-xs text-slate-400">Envía aviso al correo institucional</p>
                    </div>
                  </label>
                  {form.notifyChannels.length === 0 && (
                    <p className="text-xs text-slate-400 px-2 italic">Sin aviso — el evento se guarda sin notificar.</p>
                  )}
                </div>
              </div>

              {/* Cross-post a Comunicaciones (solo al crear) */}
              {modal.mode === 'add' && (
                <label className="flex items-center gap-2 cursor-pointer bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-100 dark:border-purple-800">
                  <input type="checkbox" checked={form.addToComunicaciones}
                    onChange={e => setForm(f => ({ ...f, addToComunicaciones: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-400" />
                  <div className="flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Agregar también a Comunicaciones</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Aparecerá como comunicado en esa sección</p>
                    </div>
                  </div>
                </label>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                <button onClick={handleSave} disabled={!form.titulo.trim() || !form.fecha} className="btn-primary disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {modal.mode === 'edit' ? 'Guardar cambios' : 'Crear evento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ─────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-center font-semibold text-slate-800 dark:text-white text-lg mb-2">¿Eliminar evento?</h3>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
