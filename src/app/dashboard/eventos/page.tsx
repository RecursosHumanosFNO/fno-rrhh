'use client'

import { useState, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { parseLocalDate, EVENTO_TIPO_LABEL, EVENTO_TIPO_COLOR, EVENTO_TIPO_DOT, formatFecha } from '@/lib/utils'
import type { EventoTipo, Evento } from '@/types'
import {
  Calendar, PartyPopper, Plus, ChevronLeft, ChevronRight,
  Edit2, Trash2, X, Save, Image as ImageIcon, Loader2,
  Paperclip, Download,
} from 'lucide-react'

const TIPOS_EVENTO: EventoTipo[] = ['feriado', 'jornada', 'acto', 'capacitacion', 'reunion', 'receso', 'proyecto', 'institucional', 'reunion_padres', 'examen', 'inscripciones', 'salida', 'religioso', 'otro']

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_NOMBRE = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function emptyForm(): Omit<Evento, 'id'> {
  return { titulo: '', fecha: '', tipo: 'jornada', descripcion: '' }
}

export default function EventosPage() {
  const { user } = useAuth()
  const { empleados, eventos, addEvento, updateEvento, deleteEvento } = useData()
  const isAdmin = user?.role === 'admin'

  const hoy = new Date()
  const [viewAnio, setViewAnio] = useState(hoy.getFullYear())
  const [viewMes, setViewMes] = useState(hoy.getMonth()) // 0-based

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; evento?: Evento; fechaDefault?: string } | null>(null)
  const [form, setForm] = useState<Omit<Evento, 'id'>>(emptyForm())
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

  // ── Eventos del mes visible ───────────────────────────────────────────────
  const eventosMes = useMemo(() => eventos.filter(ev => {
    const f = parseLocalDate(ev.fecha)
    return f.getFullYear() === viewAnio && f.getMonth() === viewMes
  }), [eventos, viewAnio, viewMes])

  // ── Eventos del día seleccionado ──────────────────────────────────────────
  const eventosDia = useMemo(() => {
    if (!selectedDay) return []
    return eventos.filter(ev => ev.fecha === selectedDay)
  }, [eventos, selectedDay])

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
    setModal({ mode: 'add', fechaDefault })
  }
  function openEdit(ev: Evento) {
    setForm({ titulo: ev.titulo, fecha: ev.fecha, tipo: ev.tipo, descripcion: ev.descripcion ?? '', imagen: ev.imagen, adjuntoUrl: ev.adjuntoUrl, adjuntoNombre: ev.adjuntoNombre })
    setModal({ mode: 'edit', evento: ev })
  }

  function handleSave() {
    if (!form.titulo.trim() || !form.fecha) return
    if (modal?.mode === 'edit' && modal.evento) {
      updateEvento(modal.evento.id, form)
    } else {
      addEvento(form)
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Eventos y Calendario</h1>
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

                return (
                  <button
                    key={fechaStr}
                    onClick={() => setSelectedDay(esSelected ? null : fechaStr)}
                    className={`aspect-square rounded-lg p-1 flex flex-col items-center transition-all text-xs relative
                      ${esSelected ? 'bg-brand-700 text-white shadow-md' : esHoy ? 'bg-sky-100 dark:bg-sky-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                      ${esFinDeSemana && !esHoy && !esSelected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}
                    `}
                  >
                    <span className={`font-semibold text-sm leading-none mt-1 ${esHoy && !esSelected ? 'text-sky-700 dark:text-sky-400' : ''}`}>
                      {dia}
                    </span>
                    {tienePuntos && (
                      <div className="flex gap-1 mt-auto mb-1 flex-wrap justify-center">
                        {evs.slice(0, 2).map((ev, j) => (
                          <div
                            key={j}
                            className={`w-2 h-2 rounded-full shadow-sm ${esSelected ? 'bg-white/90' : EVENTO_TIPO_DOT[ev.tipo]}`}
                          />
                        ))}
                        {/* Punto rosa de cumpleaños */}
                        {cumpleCount > 0 && (
                          <div className={`w-2 h-2 rounded-full shadow-sm ${esSelected ? 'bg-pink-200' : 'bg-pink-500'}`} />
                        )}
                        {evs.length > 2 && (
                          <span className={`text-[9px] leading-none ${esSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            +{evs.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {TIPOS_EVENTO.map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${EVENTO_TIPO_DOT[t]}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {EVENTO_TIPO_LABEL[t].replace(/^\S+\s/, '')}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm bg-pink-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Cumpleaños</span>
              </div>
            </div>
          </div>

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
                    <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className={`badge text-xs shrink-0 ${EVENTO_TIPO_COLOR[ev.tipo]}`}>
                        {EVENTO_TIPO_LABEL[ev.tipo]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ev.titulo}</p>
                        {ev.descripcion && <p className="text-xs text-slate-400 mt-0.5">{ev.descripcion}</p>}
                        {ev.imagen && <img src={ev.imagen} alt="" className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 max-h-44 w-auto" />}
                        {ev.adjuntoUrl && (
                          <a href={ev.adjuntoUrl} target="_blank" rel="noopener noreferrer" download={ev.adjuntoNombre}
                            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg px-2.5 py-1.5 transition-colors w-fit">
                            <Download className="w-3.5 h-3.5" /> {ev.adjuntoNombre || 'Descargar adjunto'}
                          </a>
                        )}
                      </div>
                      {isAdmin && (
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
                        {isAdmin && (
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
          {/* Próximos eventos (30 días) */}
          <div className="card p-5">
            <p className="section-title text-base mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Próximos 30 días
            </p>
            {(() => {
              const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
              const hasta = new Date(desde.getTime() + 30 * 24 * 60 * 60 * 1000)
              const proximos = eventos.filter(ev => {
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
          <div className="card w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">
                {modal.mode === 'edit' ? 'Editar evento' : 'Nuevo evento'}
              </p>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Título *</label>
                <input
                  className="form-input"
                  placeholder="Ej: Acto por el Día de la Bandera"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Fecha *</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Tipo *</label>
                  <select
                    className="form-select"
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as EventoTipo }))}
                  >
                    {TIPOS_EVENTO.map(t => (
                      <option key={t} value={t}>{EVENTO_TIPO_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Descripción (opcional)</label>
                <textarea
                  className="form-input resize-none"
                  rows={3}
                  placeholder="Detalles adicionales..."
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              {/* Imagen / GIF (opcional) */}
              <div>
                <label className="form-label">Imagen o GIF <span className="text-slate-400 font-normal">(opcional)</span></label>
                {form.imagen ? (
                  <div className="relative inline-block">
                    <img src={form.imagen} alt="" className="max-h-40 rounded-xl border border-slate-200 dark:border-slate-700" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, imagen: undefined }))}
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
              {/* Archivo adjunto (PDF, Word, etc.) opcional */}
              <div>
                <label className="form-label">Archivo adjunto <span className="text-slate-400 font-normal">(PDF, Word, Excel... opcional)</span></label>
                {form.adjuntoUrl ? (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                    <Paperclip className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{form.adjuntoNombre}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, adjuntoUrl: undefined, adjuntoNombre: undefined }))} className="text-slate-400 hover:text-red-500" title="Quitar adjunto">
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
              <div className="flex gap-2 justify-end">
                <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={!form.titulo.trim() || !form.fecha}
                  className="btn-primary disabled:opacity-50"
                >
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
