'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { formatFecha, calcularAntiguedad, calcularEdad } from '@/lib/utils'
import type { Empleado } from '@/types'
import { SECTORES } from '@/lib/mockData'
import {
  User, Edit2, Save, X, Lock, Building2, Phone, Mail,
  Clock, CheckCircle2, Eye, EyeOff, Camera, Image as ImageIcon,
  Shield, AlertCircle,
} from 'lucide-react'

export default function PerfilPage() {
  const { empleado, user, updateEmpleado } = useAuth()
  const { users, updateUserPassword } = useData()
  const [editMode, setEditMode] = useState(false)
  const [editPass, setEditPass] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
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
    tipoContrato: empleado?.tipoContrato ?? '',
    jornada: empleado?.jornada ?? '',
    supervisor: empleado?.supervisor ?? '',
    fechaIngreso: empleado?.fechaIngreso ?? '',
  })

  const [passForm, setPassForm] = useState({ old: '', nueva: '', confirm: '' })
  const fotoRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  if (!empleado || !user) return null

  const edad = empleado.fechaNacimiento ? calcularEdad(empleado.fechaNacimiento) : null
  const antiguedad = calcularAntiguedad(empleado.fechaIngreso)

  function handleSave() {
    updateEmpleado({
      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      cuil: form.cuil,
      fechaNacimiento: form.fechaNacimiento,
      telefono: form.telefono,
      direccion: form.direccion,
      contactoEmergencia: {
        nombre: form.contactoNombre,
        telefono: form.contactoTelefono,
        relacion: form.contactoRelacion,
      },
      cbu: form.cbu,
      banco: form.banco,
      sector: form.sector,
      cargo: form.cargo,
      tipoContrato: form.tipoContrato as Empleado['tipoContrato'],
      jornada: form.jornada as Empleado['jornada'],
      supervisor: form.supervisor,
      fechaIngreso: form.fechaIngreso,
    })
    setEditMode(false)
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
      tipoContrato: empleado!.tipoContrato,
      jornada: empleado!.jornada,
      supervisor: empleado!.supervisor ?? '',
      fechaIngreso: empleado!.fechaIngreso,
    })
    setEditMode(false)
  }

  function handlePhotoUpload(file: File, field: 'foto' | 'fotoCover') {
    const reader = new FileReader()
    reader.onload = e => {
      const base64 = e.target?.result as string
      updateEmpleado({ [field]: base64 })
    }
    reader.readAsDataURL(file)
  }

  function handlePasswordChange() {
    const userRecord = users.find(u => u.id === user!.id)
    if (!userRecord) return
    if (passForm.old !== userRecord.password) {
      setPassMsg({ type: 'err', msg: 'La contraseña actual es incorrecta.' })
      return
    }
    if (passForm.nueva.length < 6) {
      setPassMsg({ type: 'err', msg: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (passForm.nueva !== passForm.confirm) {
      setPassMsg({ type: 'err', msg: 'Las contraseñas nuevas no coinciden.' })
      return
    }
    updateUserPassword(user!.id, passForm.nueva)
    setPassMsg({ type: 'ok', msg: 'Contraseña actualizada correctamente.' })
    setPassForm({ old: '', nueva: '', confirm: '' })
    setTimeout(() => { setPassMsg(null); setEditPass(false) }, 2500)
  }

  return (
    <div className="page-container max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mi Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Tu información personal y laboral</p>
      </div>

      {/* Profile card */}
      <div className="card">
        {/* Cover photo */}
        <div className="relative h-32 bg-gradient-to-r from-brand-700 to-brand-500 overflow-hidden rounded-t-xl group cursor-pointer" onClick={() => coverRef.current?.click()}>
          {empleado.fotoCover && (
            <img src={empleado.fotoCover} alt="" className="w-full h-full object-cover absolute inset-0" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/90 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Cambiar portada
            </div>
          </div>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'fotoCover')}
          />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              {/* Profile photo */}
              <div className="relative group cursor-pointer" onClick={() => fotoRef.current?.click()}>
                <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden bg-brand-700">
                  {empleado.foto
                    ? <img src={empleado.foto} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                        {empleado.nombre.charAt(0)}{empleado.apellido.charAt(0)}
                      </div>
                  }
                </div>
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <input
                  ref={fotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'foto')}
                />
              </div>

              <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{empleado.nombre} {empleado.apellido}</h2>
                <p className="text-slate-500 dark:text-slate-400">{empleado.cargo}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">{empleado.sector}</p>
              </div>
            </div>

            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="btn-secondary mb-2">
                <Edit2 className="w-4 h-4" /> Editar datos
              </button>
            ) : (
              <div className="flex gap-2 mb-2">
                <button onClick={handleCancel} className="btn-secondary">
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button onClick={handleSave} className="btn-primary">
                  <Save className="w-4 h-4" /> Guardar
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
              <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</p>
              </div>
            ))}
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
                  ? <select className="form-select text-sm max-w-[55%]" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                      {SECTORES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.sector}</span>}
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Cargo</span>
                {editMode
                  ? <input className="form-input text-sm max-w-[55%]" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.cargo}</span>}
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Fecha de ingreso</span>
                {editMode
                  ? <input className="form-input text-sm max-w-[55%]" type="date" value={form.fechaIngreso} onChange={e => setForm(f => ({ ...f, fechaIngreso: e.target.value }))} />
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatFecha(empleado.fechaIngreso)}</span>}
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Tipo de contrato</span>
                {editMode
                  ? <select className="form-select text-sm max-w-[55%]" value={form.tipoContrato} onChange={e => setForm(f => ({ ...f, tipoContrato: e.target.value }))}>
                      <option>Planta Permanente</option><option>Contrato</option><option>Planta Provisional</option><option>Pasantía</option>
                    </select>
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.tipoContrato}</span>}
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Jornada</span>
                {editMode
                  ? <select className="form-select text-sm max-w-[55%]" value={form.jornada} onChange={e => setForm(f => ({ ...f, jornada: e.target.value }))}>
                      <option>Full Time</option><option>Part Time</option><option>Por Horas</option>
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
              <label className="form-label">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  className="form-input pr-10"
                  placeholder="••••••••"
                  value={passForm.old}
                  onChange={e => setPassForm(p => ({ ...p, old: e.target.value }))}
                />
                <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="form-input pr-10"
                  placeholder="Mínimo 6 caracteres"
                  value={passForm.nueva}
                  onChange={e => setPassForm(p => ({ ...p, nueva: e.target.value }))}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Confirmar nueva contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={passForm.confirm}
                onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditPass(false); setPassMsg(null); setPassForm({ old: '', nueva: '', confirm: '' }) }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={handlePasswordChange} className="btn-primary">
                <CheckCircle2 className="w-4 h-4" /> Actualizar contraseña
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
