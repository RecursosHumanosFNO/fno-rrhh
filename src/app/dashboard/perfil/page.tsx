'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatFecha, calcularAntiguedad, calcularEdad } from '@/lib/utils'
import type { Empleado } from '@/types'
import { SECTORES, CARGOS_POR_SECTOR } from '@/lib/mockData'
import {
  User, Edit2, Save, X, Lock, Building2, Phone, Mail,
  Clock, CheckCircle2, Eye, EyeOff, Camera, Image as ImageIcon,
  Shield, AlertCircle, Loader2,
} from 'lucide-react'

export default function PerfilPage() {
  const { empleado, user, updateEmpleado } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [editPass, setEditPass] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

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

  const [passForm, setPassForm] = useState({ nueva: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!empleado || !user) return null

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
      sector: form.sector,
      cargo: form.cargo,
      jornada: form.jornada,
      supervisor: form.supervisor,
      fecha_ingreso: form.fechaIngreso,
      // Preservar fotos actuales para que el upsert no las pise
      foto: empleado!.foto ?? '',
      foto_cover: empleado!.fotoCover ?? '',
    }

    try {
      const { data: { user: authUser } } = await supabase!.auth.getUser()
      const res = await fetch('/api/perfil', {
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
        cbu: form.cbu, banco: form.banco, sector: form.sector, cargo: form.cargo,
        jornada: form.jornada as Empleado['jornada'], supervisor: form.supervisor, fechaIngreso: form.fechaIngreso,
      })
      setEditMode(false)
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

  // Comprime/redimensiona la imagen antes de guardarla (evita guardar
  // fotos enormes en base64). Avatar: 400px, Cover: 1200px.
  function handlePhotoUpload(file: File, field: 'foto' | 'fotoCover') {
    const maxSide = field === 'fotoCover' ? 1200 : 400
    const dbField = field === 'fotoCover' ? 'foto_cover' : 'foto'
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        // Actualizar estado local
        updateEmpleado({ [field]: dataUrl })
        // Persistir vía API (bypasea RLS)
        try {
          const { data: { user: authUser } } = await supabase!.auth.getUser()
          fetch('/api/perfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              authId: authUser?.id,
              empleadoId: empleado!.id,
              data: { [dbField]: dataUrl },
            }),
          }).catch(() => {})
        } catch { /* no crítico — se guarda igual al hacer Guardar */ }
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  async function handlePasswordChange() {
    if (passForm.nueva.length < 6) {
      setPassMsg({ type: 'err', msg: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (passForm.nueva !== passForm.confirm) {
      setPassMsg({ type: 'err', msg: 'La confirmación no coincide con la nueva contraseña.' })
      return
    }
    if (!supabase || !empleado?.email) {
      setPassMsg({ type: 'err', msg: 'Error de conexión. Intentá de nuevo.' })
      return
    }

    // Timeout para que nunca quede girando si el servidor no responde
    const timeout = <T,>(p: PromiseLike<T>) =>
      Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))])

    setSavingPass(true)
    setPassMsg(null)
    try {
      // Como el empleado ya tiene sesión activa, esa es la prueba de identidad
      // (igual que el reset por email). Una sola llamada, rápida.
      const { error: updErr } = await timeout(supabase.auth.updateUser({ password: passForm.nueva }))
      setSavingPass(false)
      if (updErr) {
        setPassMsg({ type: 'err', msg: 'No se pudo actualizar la contraseña. Intentá de nuevo.' })
        return
      }

      // 3. Avisar por email (sin incluir la contraseña)
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password_changed', data: { nombre: empleado.nombre, email: empleado.email } }),
      }).catch(() => { /* el email es no crítico */ })

      setPassMsg({ type: 'ok', msg: 'Contraseña actualizada. Por seguridad, vas a iniciar sesión de nuevo...' })
      setPassForm({ nueva: '', confirm: '' })
      // Por seguridad: cerrar sesión local y forzar recarga completa al login.
      // (scope 'local' es instantáneo y no se cuelga; el reload garantiza
      //  que no haya carrera con el evento USER_UPDATED que re-autentica)
      setTimeout(async () => {
        await supabase!.auth.signOut({ scope: 'local' }).catch(() => {})
        window.location.href = '/login'
      }, 2500)
    } catch {
      setSavingPass(false)
      setPassMsg({ type: 'err', msg: 'El servidor tardó en responder. Intentá de nuevo en un momento.' })
    }
  }

  // Validaciones en vivo del formulario de contraseña
  const nuevaCorta = passForm.nueva.length > 0 && passForm.nueva.length < 6
  const confirmNoCoincide = passForm.confirm.length > 0 && passForm.nueva !== passForm.confirm
  const passFormValido = passForm.nueva.length >= 6 && passForm.nueva === passForm.confirm

  return (
    <div className="page-container">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mi Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Tu información personal y laboral</p>
      </div>

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
                          onClick={() => updateEmpleado({ foto: '', fotoCover: '' })}
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
                      onClick={() => updateEmpleado({ fotoCover: '' })}
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
                {editMode
                  ? <select className="form-select text-sm max-w-[55%]" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value, cargo: '' }))}>
                      {SECTORES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.sector}</span>}
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Cargo</span>
                {editMode
                  ? <select className="form-select text-sm max-w-[55%]" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {(CARGOS_POR_SECTOR[form.sector] ?? []).map(c => <option key={c}>{c}</option>)}
                    </select>
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.cargo}</span>}
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Fecha de ingreso</span>
                {editMode
                  ? <input className="form-input text-sm max-w-[55%]" type="date" value={form.fechaIngreso} onChange={e => setForm(f => ({ ...f, fechaIngreso: e.target.value }))} />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatFecha(empleado.fechaIngreso)}</span>}
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
                {editMode
                  ? <input className="form-input text-sm max-w-[55%]" value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))} />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.supervisor || '—'}</span>}
              </div>
            </div>
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

      {/* Cambiar contraseña */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title flex items-center gap-2"><Lock className="w-4 h-4" /> Cambiar Contraseña</p>
          {!editPass && (
            <button onClick={() => setEditPass(true)} className="btn-secondary text-sm">Cambiar</button>
          )}
        </div>
        {editPass ? (
          <div className="max-w-sm space-y-4">
            {passMsg && (
              <div className={`rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${
                passMsg.type === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {passMsg.type === 'ok'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />
                }
                {passMsg.msg}
              </div>
            )}
            <div>
              <label className="form-label">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className={`form-input pr-10 ${nuevaCorta ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
                  placeholder="Mínimo 6 caracteres"
                  value={passForm.nueva}
                  onChange={e => setPassForm(p => ({ ...p, nueva: e.target.value }))}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {nuevaCorta && <p className="text-xs text-red-500 mt-1">Debe tener al menos 6 caracteres.</p>}
            </div>
            <div>
              <label className="form-label">Confirmar nueva contraseña</label>
              <input
                type="password"
                className={`form-input ${confirmNoCoincide ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
                placeholder="••••••••"
                value={passForm.confirm}
                onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
              />
              {confirmNoCoincide && <p className="text-xs text-red-500 mt-1">No coincide con la nueva contraseña.</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditPass(false); setPassMsg(null); setPassForm({ nueva: '', confirm: '' }) }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={handlePasswordChange} disabled={savingPass || !passFormValido} className="btn-primary disabled:opacity-50">
                {savingPass
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                  : <><CheckCircle2 className="w-4 h-4" /> Actualizar contraseña</>}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tu contraseña fue configurada al registrarte. Recomendamos cambiarla regularmente.
          </p>
        )}
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
