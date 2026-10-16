'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/authFetch'
import { formatFecha, calcularAntiguedad, calcularEdad } from '@/lib/utils'
import type { Empleado } from '@/types'
import {
  User, Edit2, Save, X, Lock, Building2, Phone, Mail,
  Clock, CheckCircle2, Camera, Image as ImageIcon,
  Shield, AlertCircle, AlertTriangle, Bell,
} from 'lucide-react'
import { PushToggle } from '@/components/PushToggle'
import { CredencialArt } from '@/components/CredencialArt'

export default function PerfilPage() {
  const { empleado, user, updateEmpleado } = useAuth()
  const [editMode, setEditMode] = useState(false)

  const [form, setForm] = useState({
    nombre: empleado?.nombre ?? '',
    apellido: empleado?.apellido ?? '',
    dni: empleado?.dni ?? '',
    cuil: empleado?.cuil ?? '',
    fechaNacimiento: empleado?.fechaNacimiento ?? '',
    telefono: empleado?.telefono ?? '',
    direccion: empleado?.direccion ?? '',
    contactoNombre: empleado?.contactoEmergencia.nombre ?? '',
    contactoTelefono: empleado?.contactoEmergencia.telefono ?? '',
    contactoRelacion: empleado?.contactoEmergencia.relacion ?? '',
    cbu: empleado?.cbu ?? '',
    banco: empleado?.banco ?? '',
    sector: empleado?.sector ?? '',
    cargo: empleado?.cargo ?? '',
    jornada: empleado?.jornada ?? '',
    supervisor: empleado?.supervisor ?? '',
    fechaIngreso: empleado?.fechaIngreso ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  if (!empleado || !user) return null

  const missingFields: string[] = [
    ...(!empleado.fechaNacimiento ? ['Fecha de nacimiento'] : []),
    ...(!empleado.cuil ? ['CUIL'] : []),
    ...(!empleado.telefono ? ['Teléfono'] : []),
    ...(!empleado.direccion ? ['Dirección'] : []),
    ...(!empleado.cbu ? ['CBU'] : []),
    ...(!empleado.banco ? ['Banco'] : []),
    ...(!empleado.contactoEmergencia?.nombre ? ['Contacto emergencia — nombre'] : []),
    ...(!empleado.contactoEmergencia?.telefono ? ['Contacto emergencia — teléfono'] : []),
    ...(!empleado.contactoEmergencia?.relacion ? ['Contacto emergencia — relación'] : []),
    ...(!empleado.foto ? ['Foto de perfil'] : []),
  ]

  const edad = empleado.fechaNacimiento ? calcularEdad(empleado.fechaNacimiento) : null
  const antiguedad = calcularAntiguedad(empleado.fechaIngreso)

  // Abre el modo edición con los datos actuales del empleado (fix: form inicializado antes de que cargue empleado)
  function handleEditStart() {
    setForm({
      nombre: empleado!.nombre,
      apellido: empleado!.apellido,
      dni: empleado!.dni,
      cuil: empleado!.cuil ?? '',
      fechaNacimiento: empleado!.fechaNacimiento,
      telefono: empleado!.telefono,
      direccion: empleado!.direccion,
      contactoNombre: empleado!.contactoEmergencia.nombre,
      contactoTelefono: empleado!.contactoEmergencia.telefono,
      contactoRelacion: empleado!.contactoEmergencia.relacion,
      cbu: empleado!.cbu ?? '',
      banco: empleado!.banco ?? '',
      sector: empleado!.sector,
      cargo: empleado!.cargo,
      jornada: empleado!.jornada,
      supervisor: empleado!.supervisor ?? '',
      fechaIngreso: empleado!.fechaIngreso,
    })
    setEditMode(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const payload = {
      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      cuil: form.cuil,
      fecha_nacimiento: form.fechaNacimiento,
      telefono: form.telefono,
      direccion: form.direccion,
      contacto_emergencia: {
        nombre: form.contactoNombre,
        telefono: form.contactoTelefono,
        relacion: form.contactoRelacion,
      },
      cbu: form.cbu,
      banco: form.banco,
      jornada: form.jornada,
      // Sector, cargo, supervisor y fecha de ingreso no se mandan: los define
      // RRHH y la ruta los ignora para un empleado. Mandarlos igual haría que
      // la pantalla mostrara un cambio que la base nunca guardó.
      // Las fotos se guardan al subirlas (handlePhotoUpload) — no incluirlas
      // acá para evitar que un upsert con valor vacío/stale las pise.
    }

    try {
      const { data: { user: authUser } } = await supabase!.auth.getUser()
      const res = await authFetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId: authUser?.id, empleadoId: empleado!.id, data: payload }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setSaveError(json.error ?? 'No se pudieron guardar los cambios')
        setSaving(false)
        return
      }
      // Actualizar estado local inmediatamente
      updateEmpleado({
        nombre: form.nombre, apellido: form.apellido, dni: form.dni, cuil: form.cuil,
        fechaNacimiento: form.fechaNacimiento, telefono: form.telefono, direccion: form.direccion,
        contactoEmergencia: { nombre: form.contactoNombre, telefono: form.contactoTelefono, relacion: form.contactoRelacion },
        cbu: form.cbu, banco: form.banco,
        jornada: form.jornada as Empleado['jornada'],
      })
      setEditMode(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3500)
    } catch {
      setSaveError('Error de conexión. Intentá de nuevo.')
    }
    setSaving(false)
  }

  function handleCancel() {
    setForm({
      nombre: empleado!.nombre,
      apellido: empleado!.apellido,
      dni: empleado!.dni,
      cuil: empleado!.cuil ?? '',
      fechaNacimiento: empleado!.fechaNacimiento,
      telefono: empleado!.telefono,
      direccion: empleado!.direccion,
      contactoNombre: empleado!.contactoEmergencia.nombre,
      contactoTelefono: empleado!.contactoEmergencia.telefono,
      contactoRelacion: empleado!.contactoEmergencia.relacion,
      cbu: empleado!.cbu ?? '',
      banco: empleado!.banco ?? '',
      sector: empleado!.sector,
      cargo: empleado!.cargo,
      jornada: empleado!.jornada,
      supervisor: empleado!.supervisor ?? '',
      fechaIngreso: empleado!.fechaIngreso,
    })
    setEditMode(false)
  }

  // Comprime/redimensiona y sube a Supabase Storage (fno-media/fotos/).
  // Fallback a base64 si Storage falla. Avatar: 400px, Cover: 1200px.
  function handlePhotoUpload(file: File, field: 'foto' | 'fotoCover') {
    const maxSide = field === 'fotoCover' ? 1200 : 400
    const dbField = field === 'fotoCover' ? 'foto_cover' : 'foto'
    const storageName = field === 'fotoCover' ? 'cover.jpg' : 'perfil.jpg'
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = async () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, w, h)

        let fotoValue: string
        try {
          const blob = await new Promise<Blob>((res, rej) => {
            canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob')), 'image/jpeg', 0.85)
          })
          const storagePath = `fotos/${empleado!.id}/${storageName}`
          const { error } = await supabase!.storage
            .from('fno-media').upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true })
          if (error) throw error
          const { data: urlData } = supabase!.storage.from('fno-media').getPublicUrl(storagePath)
          // Parámetro de versión para invalidar caché CDN en cada cambio
          fotoValue = `${urlData.publicUrl}?v=${Date.now()}`
        } catch {
          // Si Storage falla, guardamos base64 como respaldo
          fotoValue = canvas.toDataURL('image/jpeg', 0.85)
        }

        updateEmpleado({ [field]: fotoValue })
        try {
          const { data: { user: authUser } } = await supabase!.auth.getUser()
          authFetch('/api/perfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              authId: authUser?.id,
              empleadoId: empleado!.id,
              data: { [dbField]: fotoValue },
            }),
          }).catch(() => {})
        } catch { /* no crítico — se guarda igual al hacer Guardar */ }
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Elimina una foto: borra de Storage si aplica y persiste el vacío vía API.
  async function handlePhotoDelete(field: 'foto' | 'fotoCover') {
    const dbField = field === 'fotoCover' ? 'foto_cover' : 'foto'
    const current = field === 'fotoCover' ? empleado!.fotoCover : empleado!.foto
    if (current?.includes('fno-media')) {
      const storageName = field === 'fotoCover' ? 'cover.jpg' : 'perfil.jpg'
      supabase?.storage.from('fno-media').remove([`fotos/${empleado!.id}/${storageName}`]).catch(() => {})
    }
    updateEmpleado({ [field]: '' })
    try {
      const { data: { user: authUser } } = await supabase!.auth.getUser()
      authFetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: authUser?.id,
          empleadoId: empleado!.id,
          data: { [dbField]: '' },
        }),
      }).catch(() => {})
    } catch { /* no crítico */ }
  }

  return (
    <div className="page-container">
      {saveOk && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-scale-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">✓ Cambios guardados correctamente</p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mi Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Tu información personal y laboral</p>
      </div>

      {/* Banner datos faltantes */}
      {missingFields.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-700/30 dark:bg-amber-900/10 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Perfil incompleto · {missingFields.length} dato{missingFields.length > 1 ? 's' : ''} faltante{missingFields.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Completá tu perfil haciendo clic en <strong>Editar datos</strong>. Faltan los siguientes campos:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {missingFields.map(f => (
                <span key={f} className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-800/25 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 border border-amber-200 dark:border-amber-700/30 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />{f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile card */}
      <div className="card overflow-hidden">
        <div className="relative">
          {/* Blurred cover background */}
          <div className="absolute inset-0">
            {empleado.fotoCover
              ? <img src={empleado.fotoCover} alt="" className="w-full h-full object-cover scale-105 blur-sm" />
              : null
            }
            <div className={`absolute inset-0 ${empleado.fotoCover ? 'bg-gradient-to-b from-slate-900/60 via-slate-900/65 to-slate-900/80' : 'bg-gradient-to-r from-brand-700 to-brand-500'}`} />
          </div>

          {/* Content overlay */}
          <div className="relative z-10 px-6 pt-5 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Profile photo */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl border-[3px] border-white/50 shadow-xl overflow-hidden bg-brand-700">
                    {empleado.foto
                      ? <img src={empleado.foto} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                          {empleado.nombre.charAt(0)}{empleado.apellido.charAt(0)}
                        </div>
                    }
                  </div>
                  {editMode && (
                    <>
                      <label className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/40 cursor-pointer" title="Cambiar foto">
                        <Camera className="w-5 h-5 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'foto')}
                        />
                      </label>
                      {empleado.foto && (
                        <button
                          onClick={() => handlePhotoDelete('foto')}
                          title="Eliminar foto"
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md z-10"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">{empleado.nombre} {empleado.apellido}</h2>
                  <p className="text-white/80 text-sm">{empleado.cargo}</p>
                  <p className="text-white/60 text-sm">{empleado.sector}</p>
                </div>
              </div>

              {saveError && (
                <div className="w-full bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-2 text-sm text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                </div>
              )}
              {!editMode ? (
                <button onClick={handleEditStart} className="btn-secondary shrink-0 bg-white/15 border-white/25 text-white hover:bg-white/25">
                  <Edit2 className="w-4 h-4" /> Editar datos
                </button>
              ) : (
                <div className="flex flex-wrap gap-2 shrink-0 items-center">
                  {/* Portada — en el mismo grupo que los botones, sin posición absoluta */}
                  <label className="btn-secondary bg-white/15 border-white/25 text-white hover:bg-white/25 cursor-pointer">
                    <ImageIcon className="w-4 h-4" /> Portada
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'fotoCover')}
                    />
                  </label>
                  {empleado.fotoCover && (
                    <button
                      onClick={() => handlePhotoDelete('fotoCover')}
                      title="Eliminar portada"
                      className="w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                  <button onClick={handleCancel} disabled={saving} className="btn-secondary bg-white/15 border-white/25 text-white hover:bg-white/25 disabled:opacity-50">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-70">
                    {saving
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                      : <><Save className="w-4 h-4" /> Guardar</>}
                  </button>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
              {[
                { label: 'Antigüedad', value: antiguedad, icon: Clock },
                { label: 'Edad', value: edad ? `${edad} años` : '—', icon: User },
                { label: 'Jornada', value: empleado.jornada, icon: Shield },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-white/70" />
                    <p className="text-xs text-white/70">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos personales */}
        <div className="card p-5">
          <p className="section-title mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Datos Personales</p>
          <div className="space-y-3">
            <Field label="Nombre">
              {editMode
                ? <input className="form-input text-sm" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.nombre}</span>}
            </Field>
            <Field label="Apellido">
              {editMode
                ? <input className="form-input text-sm" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} />
                : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.apellido}</span>}
            </Field>
            <Field label="DNI">
              {editMode
                ? <input className="form-input text-sm" value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} />
                : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.dni || '—'}</span>}
            </Field>
            <Field label="CUIL">
              {editMode
                ? <input className="form-input text-sm" value={form.cuil} onChange={e => setForm(f => ({ ...f, cuil: e.target.value }))} placeholder="20-XXXXXXXX-X" />
                : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.cuil || '—'}</span>}
            </Field>
            <Field label="Fecha de nacimiento">
              {editMode
                ? <input className="form-input text-sm" type="date" value={form.fechaNacimiento} onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} />
                : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {empleado.fechaNacimiento ? `${formatFecha(empleado.fechaNacimiento)}${edad ? ` (${edad} años)` : ''}` : '—'}
                  </span>}
            </Field>
            <Field label="Email" icon={<Mail className="w-3.5 h-3.5 text-slate-400" />}>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.email}</span>
              {editMode && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> El email no se puede cambiar. Contactá a RRHH si necesitás actualizarlo.
                </p>
              )}
            </Field>
            <Field label="Teléfono">
              {editMode
                ? <input className="form-input text-sm" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.telefono || '—'}</span>}
            </Field>
            <Field label="Dirección">
              {editMode
                ? <input className="form-input text-sm" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.direccion || '—'}</span>}
            </Field>
          </div>
        </div>

        <div className="space-y-6">
          {/* Datos laborales */}
          <div className="card p-5">
            <p className="section-title mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Datos Laborales</p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Sector</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.sector}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                {/* Esta fila se había quedado sin su etiqueta: mostraba el cargo
                    suelto, pegado abajo de "Sector", sin decir qué era. */}
                <span className="text-xs text-slate-500 dark:text-slate-400">Cargo</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.cargo}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Fecha de ingreso</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatFecha(empleado.fechaIngreso)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Jornada</span>
                {editMode
                  ? <select className="form-select text-sm max-w-[55%]" value={form.jornada} onChange={e => setForm(f => ({ ...f, jornada: e.target.value }))}>
                      <option>Full Time</option><option>Part Time</option><option>6 horas diarias</option>
                    </select>
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.jornada}</span>}
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Supervisor/a</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.supervisor || '—'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Sector, cargo, fecha de ingreso y supervisor/a los define RRHH. Si algo
              no coincide, escribinos desde Portal RRHH y lo corregimos.
            </p>
          </div>

          {/* Datos bancarios */}
          <div className="card p-5">
            <p className="section-title mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Datos Bancarios</p>
            <div className="space-y-3">
              <Field label="CBU">
                {editMode
                  ? <input className="form-input text-sm" value={form.cbu} onChange={e => setForm(f => ({ ...f, cbu: e.target.value }))} placeholder="Número de CBU" />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.cbu || '—'}</span>}
              </Field>
              <Field label="Banco">
                {editMode
                  ? <input className="form-input text-sm" value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} placeholder="Ej: Banco Provincia" />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.banco || '—'}</span>}
              </Field>
            </div>
          </div>

          {/* Contacto emergencia */}
          <div className="card p-5">
            <p className="section-title mb-4 flex items-center gap-2"><Phone className="w-4 h-4" /> Contacto de Emergencia</p>
            <div className="space-y-3">
              <Field label="Nombre">
                {editMode
                  ? <input className="form-input text-sm" value={form.contactoNombre} onChange={e => setForm(f => ({ ...f, contactoNombre: e.target.value }))} />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.contactoEmergencia.nombre || '—'}</span>}
              </Field>
              <Field label="Teléfono">
                {editMode
                  ? <input className="form-input text-sm" value={form.contactoTelefono} onChange={e => setForm(f => ({ ...f, contactoTelefono: e.target.value }))} />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.contactoEmergencia.telefono || '—'}</span>}
              </Field>
              <Field label="Relación">
                {editMode
                  ? <input className="form-input text-sm" value={form.contactoRelacion} onChange={e => setForm(f => ({ ...f, contactoRelacion: e.target.value }))} />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.contactoEmergencia.relacion || '—'}</span>}
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Acá había una sección "Cambiar contraseña".
          La saqué porque ya no cambia nada: al portal se entra con la cuenta
          de Google, así que la contraseña de Supabase no se usa para entrar.
          Peor todavía, al guardarla cerraba la sesión y mandaba al login, donde
          no hay dónde escribirla. Quien quiera cambiar su clave lo hace en su
          cuenta de Google. */}

      {/* Credencial de ART (sólo lectura: la carga RRHH) */}
      <CredencialArt empleadoId={empleado.id} credencial={empleado} puedeEditar={false} />

      {/* Notificaciones push */}
      <div className="card p-5">
        <p className="section-title flex items-center gap-2 mb-4"><Bell className="w-4 h-4" /> Notificaciones Push</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Recibí avisos importantes del portal directamente en este dispositivo, aunque la app esté cerrada.
        </p>
        <PushToggle empleadoId={empleado.id} />
      </div>
    </div>
  )
}

function Field({ label, children, icon }: {
  label: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
        <div>{children}</div>
      </div>
    </div>
  )
}
