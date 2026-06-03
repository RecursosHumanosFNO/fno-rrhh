'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import {
  NOVEDAD_CATEGORIA_COLOR, NOVEDAD_CATEGORIA_LABEL, NOVEDAD_CATEGORIAS, formatFecha,
} from '@/lib/utils'
import type { NovedadCategoria } from '@/types'
import {
  Megaphone, Plus, Pin, Calendar, PartyPopper, AlertTriangle,
  Bell, MessageSquare, X, ChevronRight, Trash2, Edit2, Save, Mail,
  Image as ImageIcon, Loader2, Paperclip, Download,
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

export default function ComunicacionesPage() {
  const { user } = useAuth()
  const { novedades, addNovedad, updateNovedad, deleteNovedad } = useData()
  const isAdmin = user?.role === 'admin'

  const [catFilter, setCatFilter] = useState<NovedadCategoria | ''>('')
  const [selectedNovedad, setSelectedNovedad] = useState<string | null>(null)
  const [showNueva, setShowNueva] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [newForm, setNewForm] = useState({
    titulo: '', contenido: '', categoria: 'novedad' as NovedadCategoria, importante: false, notifyEmail: false,
    imagen: '', adjuntoUrl: '', adjuntoNombre: '',
  })
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
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

  const filtered = novedades
    .filter(n => !catFilter || n.categoria === catFilter)
    .sort((a, b) => b.fechaPublicacion.localeCompare(a.fechaPublicacion))

  function handlePublicar() {
    if (!newForm.titulo.trim() || !newForm.contenido.trim()) return
    if (editId) {
      updateNovedad(editId, {
        titulo: newForm.titulo,
        contenido: newForm.contenido,
        categoria: newForm.categoria,
        importante: newForm.importante,
        imagen: newForm.imagen || undefined,
        adjuntoUrl: newForm.adjuntoUrl || undefined,
        adjuntoNombre: newForm.adjuntoNombre || undefined,
      })
      setEditId(null)
    } else {
      addNovedad({
        titulo: newForm.titulo,
        contenido: newForm.contenido,
        categoria: newForm.categoria,
        fechaPublicacion: new Date().toISOString().slice(0, 10),
        autor: 'RRHH',
        importante: newForm.importante,
        imagen: newForm.imagen || undefined,
        adjuntoUrl: newForm.adjuntoUrl || undefined,
        adjuntoNombre: newForm.adjuntoNombre || undefined,
      }, newForm.notifyEmail)
    }
    setShowNueva(false)
    setNewForm({ titulo: '', contenido: '', categoria: 'novedad', importante: false, notifyEmail: false, imagen: '', adjuntoUrl: '', adjuntoNombre: '' })
  }

  function handleEdit(n: { id: string; titulo: string; contenido: string; categoria: NovedadCategoria; importante: boolean; imagen?: string; adjuntoUrl?: string; adjuntoNombre?: string }) {
    setEditId(n.id)
    setNewForm({ titulo: n.titulo, contenido: n.contenido, categoria: n.categoria, importante: n.importante, notifyEmail: false, imagen: n.imagen ?? '', adjuntoUrl: n.adjuntoUrl ?? '', adjuntoNombre: n.adjuntoNombre ?? '' })
    setShowNueva(true)
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
          <button onClick={() => setShowNueva(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Publicar novedad
          </button>
        )}
      </div>

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
        {NOVEDAD_CATEGORIAS.map(cat => {
          const Icon = catIcon(cat)
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

      {/* Novedades list */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No hay novedades en esta categoría.</p>
          </div>
        ) : filtered.map(n => {
          const Icon = catIcon(n.categoria)
          const isSelected = selectedNovedad === n.id
          return (
            <div
              key={n.id}
              className={`card p-5 cursor-pointer transition-all hover:shadow-card-hover ${isSelected ? 'ring-2 ring-brand-500' : ''}`}
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
                  <Icon className={`w-5 h-5 ${NOVEDAD_CATEGORIA_COLOR[n.categoria].split(' ')[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${NOVEDAD_CATEGORIA_COLOR[n.categoria]}`}>
                      {NOVEDAD_CATEGORIA_LABEL[n.categoria]}
                    </span>
                    {n.importante && (
                      <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <Pin className="w-3 h-3 mr-0.5" /> Importante
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{n.titulo}</h3>
                  {isSelected
                    ? <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed animate-fade-in">{n.contenido}</p>
                    : <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{n.contenido}</p>
                  }
                  {n.imagen && (
                    isSelected
                      ? <img src={n.imagen} alt="" className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 max-h-80 w-auto animate-fade-in" /> /* eslint-disable-line @next/next/no-img-element */
                      : <span className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 mt-1.5"><ImageIcon className="w-3.5 h-3.5" /> Incluye imagen</span>
                  )}
                  {n.adjuntoUrl && (
                    <a href={n.adjuntoUrl} target="_blank" rel="noopener noreferrer" download={n.adjuntoNombre}
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg px-2.5 py-1.5 transition-colors w-fit">
                      <Download className="w-3.5 h-3.5" /> {n.adjuntoNombre || 'Descargar adjunto'}
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
                        onClick={ev => { ev.stopPropagation(); handleEdit(n) }}
                        className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 text-slate-400 hover:text-sky-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={ev => { ev.stopPropagation(); deleteNovedad(n.id) }}
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

      {/* Modal nueva novedad */}
      {showNueva && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowNueva(false); setEditId(null) }}>
          <div className="card w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">{editId ? 'Editar Novedad' : 'Publicar Novedad'}</p>
              <button onClick={() => { setShowNueva(false); setEditId(null) }}><X className="w-5 h-5 text-slate-400" /></button>
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
                <select className="form-select" value={newForm.categoria} onChange={e => setNewForm(f => ({ ...f, categoria: e.target.value as NovedadCategoria }))}>
                  {NOVEDAD_CATEGORIAS.map(c => (
                    <option key={c} value={c}>{NOVEDAD_CATEGORIA_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Contenido *</label>
                <textarea
                  className="form-input resize-none"
                  rows={4}
                  placeholder="Escribí el contenido del comunicado..."
                  value={newForm.contenido}
                  onChange={e => setNewForm(f => ({ ...f, contenido: e.target.value }))}
                />
              </div>
              {/* Imagen / GIF (opcional) */}
              <div>
                <label className="form-label">Imagen o GIF <span className="text-slate-400 font-normal">(opcional)</span></label>
                {newForm.imagen ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newForm.imagen} alt="" className="max-h-40 rounded-xl border border-slate-200 dark:border-slate-700" />
                    <button
                      type="button"
                      onClick={() => setNewForm(f => ({ ...f, imagen: '' }))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                      title="Quitar imagen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imgRef.current?.click()}
                    disabled={uploadingImg}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-600 transition-colors disabled:opacity-60"
                  >
                    {uploadingImg
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                      : <><ImageIcon className="w-4 h-4" /> Subir imagen o GIF</>}
                  </button>
                )}
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/*,image/gif"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
              </div>

              {/* Archivo adjunto (PDF, Word, etc.) opcional */}
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newForm.importante}
                  onChange={e => setNewForm(f => ({ ...f, importante: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">Marcar como importante (aparecerá destacado)</span>
              </label>
              {!editId && (
                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
                  <input
                    type="checkbox"
                    checked={newForm.notifyEmail}
                    onChange={e => setNewForm(f => ({ ...f, notifyEmail: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      <span className="text-sm font-medium text-brand-700 dark:text-brand-300">Notificar por email</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Envía un aviso al correo institucional de RRHH</p>
                  </div>
                </label>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowNueva(false); setEditId(null); setNewForm({ titulo: '', contenido: '', categoria: 'novedad', importante: false, notifyEmail: false, imagen: '', adjuntoUrl: '', adjuntoNombre: '' }) }} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handlePublicar}
                  disabled={!newForm.titulo.trim() || !newForm.contenido.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editId ? 'Guardar cambios' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
