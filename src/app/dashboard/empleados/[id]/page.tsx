'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { SECTORES, CARGOS_POR_SECTOR } from '@/lib/mockData'
import {
  EMPLEADO_ESTADO_COLOR, EMPLEADO_ESTADO_LABEL, SOLICITUD_TIPO_LABEL,
  SOLICITUD_ESTADO_COLOR, SOLICITUD_ESTADO_LABEL, formatFecha, formatMes,
  formatMonto, calcularAntiguedad, calcularEdad,
} from '@/lib/utils'
import type { EmpleadoEstado, Empleado } from '@/types'
import {
  ArrowLeft, Edit2, Mail, Phone, MapPin, Calendar, Building2,
  FileText, ClipboardList, Clock, Download, User, Save, X,
  Shield, CheckCircle2, AlertTriangle, Lock, Eye, EyeOff,
  Camera, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

const TABS = ['Personal', 'Laboral', 'Documentos', 'Solicitudes', 'Historial']

export default function EmpleadoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const { empleados, solicitudes, recibos, users, updateEmpleado, deleteEmpleado, updateUserPassword } = useData()

  const [tab, setTab] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const fotoRef = useRef<HTMLInputElement>(null)

  const isAdmin = user?.role === 'admin'
  const emp = empleados.find(e => e.id === id)

  if (!emp) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-slate-500">Empleado no encontrado.</p>
        <Link href="/dashboard/empleados" className="btn-primary mt-4 inline-flex">Volver</Link>
      </div>
    )
  }

  if (!isAdmin && user?.empleadoId !== id) {
    router.replace('/dashboard')
    return null
  }

  const misRecibos = recibos.filter(r => r.empleadoId === id).sort((a, b) => b.anio - a.anio || b.mes - a.mes)
  const misSolicitudes = solicitudes.filter(s => s.empleadoId === id)
  const edad = emp.fechaNacimiento ? calcularEdad(emp.fechaNacimiento) : null
  const antiguedad = calcularAntiguedad(emp.fechaIngreso)
  const empUser = users.find(u => u.empleadoId === id)

  // Missing fields detection
  const missingFields: string[] = [
    ...(!emp.fechaNacimiento ? ['Fecha de nacimiento'] : []),
    ...(!emp.cuil ? ['CUIL'] : []),
    ...(!emp.telefono ? ['Teléfono'] : []),
    ...(!emp.direccion ? ['Dirección'] : []),
    ...(!emp.cbu ? ['CBU'] : []),
    ...(!emp.banco ? ['Banco'] : []),
    ...(!emp.contactoEmergencia?.nombre ? ['Contacto emergencia — nombre'] : []),
    ...(!emp.contactoEmergencia?.telefono ? ['Contacto emergencia — teléfono'] : []),
    ...(!emp.contactoEmergencia?.relacion ? ['Contacto emergencia — relación'] : []),
    ...(!emp.foto ? ['Foto de perfil'] : []),
  ]

  // Editable form state (for admin editing)
  const [form, setForm] = useState({
    nombre: emp.nombre, apellido: emp.apellido, dni: emp.dni, cuil: emp.cuil ?? '',
    fechaNacimiento: emp.fechaNacimiento, telefono: emp.telefono, direccion: emp.direccion,
    sector: emp.sector, cargo: emp.cargo, jornada: emp.jornada,
    supervisor: emp.supervisor, estado: emp.estado, fechaIngreso: emp.fechaIngreso,
    contactoNombre: emp.contactoEmergencia.nombre,
    contactoTelefono: emp.contactoEmergencia.telefono,
    contactoRelacion: emp.contactoEmergencia.relacion,
    cbu: emp.cbu ?? '', banco: emp.banco ?? '',
  })

  function handleSave() {
    updateEmpleado(emp!.id, {
      nombre: form.nombre, apellido: form.apellido, dni: form.dni, cuil: form.cuil,
      fechaNacimiento: form.fechaNacimiento, telefono: form.telefono, direccion: form.direccion,
      sector: form.sector, cargo: form.cargo,
      jornada: form.jornada as Empleado['jornada'], supervisor: form.supervisor,
      estado: form.estado as EmpleadoEstado, fechaIngreso: form.fechaIngreso,
      contactoEmergencia: {
        nombre: form.contactoNombre,
        telefono: form.contactoTelefono,
        relacion: form.contactoRelacion,
      },
      cbu: form.cbu, banco: form.banco,
    })
    setEditMode(false)
  }

  function handlePhotoUpload(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const base64 = e.target?.result as string
      updateEmpleado(emp!.id, { foto: base64 })
    }
    reader.readAsDataURL(file)
  }

  function handlePasswordReset() {
    if (!empUser) return
    if (newPassword.length < 6) {
      setPassMsg({ type: 'err', msg: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    updateUserPassword(empUser.id, newPassword)
    setPassMsg({ type: 'ok', msg: 'Contraseña actualizada correctamente.' })
    setNewPassword('')
    setTimeout(() => setPassMsg(null), 3000)
  }

  async function handleSendResetEmail() {
    if (!empUser?.email) return
    setResetStatus('sending')
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: empUser.email }),
      }).then(r => r.json()).catch(() => ({ ok: false }))
      setResetStatus(res.ok ? 'sent' : 'error')
    } catch {
      setResetStatus('error')
    }
    setTimeout(() => setResetStatus('idle'), 5000)
  }

  return (
    <div className="page-container">
      {/* Back */}
      {isAdmin && (
        <Link href="/dashboard/empleados" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-2">
          <ArrowLeft className="w-4 h-4" /> Volver a empleados
        </Link>
      )}

      {/* Profile header */}
      <div className="card overflow-hidden">
        <div className="relative">
          {/* Blurred cover background */}
          <div className="absolute inset-0">
            {emp.fotoCover
              ? <img src={emp.fotoCover} alt="" className="w-full h-full object-cover scale-105 blur-sm" />
              : null
            }
            <div className={`absolute inset-0 ${emp.fotoCover ? 'bg-gradient-to-b from-slate-900/60 via-slate-900/65 to-slate-900/80' : 'bg-gradient-to-r from-brand-700 to-brand-500'}`} />
          </div>

          {/* Content overlay */}
          <div className="relative z-10 px-6 pt-5 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Photo */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-brand-700 border-[3px] border-white/50 flex items-center justify-center text-white text-2xl font-bold shadow-xl overflow-hidden">
                    {emp.foto
                      ? <img src={emp.foto} alt="" className="w-full h-full object-cover" />
                      : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`
                    }
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => fotoRef.current?.click()}
                        className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Camera className="w-5 h-5 text-white" />
                      </button>
                      <input
                        ref={fotoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                      />
                    </>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{emp.nombre} {emp.apellido}</h1>
                  <p className="text-white/80 text-sm">{emp.cargo} · {emp.sector}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge text-sm py-1 px-3 ${EMPLEADO_ESTADO_COLOR[emp.estado]}`}>
                  {EMPLEADO_ESTADO_LABEL[emp.estado]}
                </span>
                {isAdmin && !editMode && (
                  <button onClick={() => setEditMode(true)} className="btn-secondary bg-white/15 border-white/25 text-white hover:bg-white/25">
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                )}
                {isAdmin && editMode && (
                  <>
                    <button onClick={() => setEditMode(false)} className="btn-secondary bg-white/15 border-white/25 text-white hover:bg-white/25">
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                    <button onClick={handleSave} className="btn-primary">
                      <Save className="w-4 h-4" /> Guardar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
              {[
                { label: 'Antigüedad', value: antiguedad, icon: Calendar },
                { label: 'Edad', value: edad ? `${edad} años` : '—', icon: User },
                { label: 'Jornada', value: emp.jornada, icon: Clock },
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

      {/* Missing data warning */}
      {missingFields.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-700/30 dark:bg-amber-900/10 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Perfil incompleto · {missingFields.length} dato{missingFields.length > 1 ? 's' : ''} faltante{missingFields.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {isAdmin
                ? 'Completá los datos del empleado en la pestaña Personal para desactivar este aviso.'
                : 'Comunicáte con RRHH para completar tu perfil. Faltan los siguientes datos:'}
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === i
                ? 'border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Personal */}
      {tab === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <p className="section-title mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Datos Personales</p>
            <div className="space-y-3">
              {[
                { label: 'Nombre', key: 'nombre', value: form.nombre },
                { label: 'Apellido', key: 'apellido', value: form.apellido },
                { label: 'DNI', key: 'dni', value: form.dni },
                { label: 'CUIL', key: 'cuil', value: form.cuil },
              ].map(({ label, key, value }) => (
                <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-40 shrink-0">{label}</span>
                  {isAdmin && editMode
                    ? <input className="form-input text-sm flex-1" value={value} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    : <span className="text-sm text-slate-700 dark:text-slate-300">{value || '—'}</span>
                  }
                </div>
              ))}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-40 shrink-0">Fecha de nacimiento</span>
                {isAdmin && editMode
                  ? <input className="form-input text-sm flex-1" type="date" value={form.fechaNacimiento} onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} />
                  : <span className="text-sm text-slate-700 dark:text-slate-300">{emp.fechaNacimiento ? `${formatFecha(emp.fechaNacimiento)}${edad ? ` (${edad} años)` : ''}` : '—'}</span>
                }
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-40 shrink-0">Email</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{emp.email}</span>
              </div>
              {[
                { label: 'Teléfono', key: 'telefono', value: form.telefono },
                { label: 'Dirección', key: 'direccion', value: form.direccion },
                { label: 'CBU', key: 'cbu', value: form.cbu },
                { label: 'Banco', key: 'banco', value: form.banco },
              ].map(({ label, key, value }) => (
                <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-40 shrink-0">{label}</span>
                  {isAdmin && editMode
                    ? <input className="form-input text-sm flex-1" value={value} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    : <span className="text-sm text-slate-700 dark:text-slate-300">{value || '—'}</span>
                  }
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <p className="section-title mb-4 flex items-center gap-2"><Phone className="w-4 h-4" /> Contacto de Emergencia</p>
              <div className="space-y-3">
                {[
                  { label: 'Nombre', key: 'contactoNombre', value: form.contactoNombre },
                  { label: 'Teléfono', key: 'contactoTelefono', value: form.contactoTelefono },
                  { label: 'Relación', key: 'contactoRelacion', value: form.contactoRelacion },
                ].map(({ label, key, value }) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-28 shrink-0">{label}</span>
                    {isAdmin && editMode
                      ? <input className="form-input text-sm flex-1" value={value} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                      : <span className="text-sm text-slate-700 dark:text-slate-300">{value || '—'}</span>
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Password management (admin only) */}
            {isAdmin && (
              <div className="card p-5">
                <p className="section-title mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> Gestión de Contraseña</p>
                {empUser ? (
                  <div className="space-y-4">
                    {/* Secure reset via email */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Enviar link de recuperación</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Se enviará un enlace seguro a <strong>{empUser.email}</strong> para que el empleado establezca su propia contraseña. Válido por 30 minutos.
                      </p>
                      {resetStatus === 'sent' && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 rounded-lg px-3 py-2 text-xs flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> Link enviado correctamente al email del empleado.
                        </div>
                      )}
                      {resetStatus === 'error' && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 text-xs flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 shrink-0" /> No se pudo enviar. Verificá que el email esté configurado.
                        </div>
                      )}
                      <button
                        onClick={handleSendResetEmail}
                        disabled={resetStatus === 'sending' || resetStatus === 'sent'}
                        className="btn-primary text-sm disabled:opacity-50"
                      >
                        {resetStatus === 'sending' ? (
                          <><Shield className="w-4 h-4 animate-pulse" /> Enviando...</>
                        ) : resetStatus === 'sent' ? (
                          <><CheckCircle2 className="w-4 h-4" /> Enviado</>
                        ) : (
                          <><Mail className="w-4 h-4" /> Enviar link de reset</>
                        )}
                      </button>
                    </div>

                    {/* Manual override (admin force-set) */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                        O establecer contraseña manualmente
                      </p>
                      {passMsg && (
                        <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 mb-2 ${
                          passMsg.type === 'ok'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}>
                          {passMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {passMsg.msg}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            className="form-input text-sm pr-10 w-full"
                            placeholder="Nueva contraseña (mín. 6 caracteres)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                          />
                          <button onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button onClick={handlePasswordReset} className="btn-secondary shrink-0">
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Este empleado no tiene cuenta de acceso creada.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Laboral */}
      {tab === 1 && (
        <div className="card p-5">
          <p className="section-title mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Datos Laborales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            <EditField label="Sector" value={form.sector} editMode={isAdmin && editMode}
              editor={<select className="form-select text-sm" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value, cargo: '' }))}>{SECTORES.map(s => <option key={s}>{s}</option>)}</select>} />
            <EditField label="Cargo" value={form.cargo} editMode={isAdmin && editMode}
              editor={<select className="form-select text-sm" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}>
                <option value="">Seleccionar</option>
                {(CARGOS_POR_SECTOR[form.sector] ?? []).map(c => <option key={c}>{c}</option>)}
              </select>} />
            <EditField label="Fecha de ingreso" value={formatFecha(emp.fechaIngreso)} editMode={isAdmin && editMode}
              editor={<input className="form-input text-sm" type="date" value={form.fechaIngreso} onChange={e => setForm(f => ({ ...f, fechaIngreso: e.target.value }))} />} />
            <EditField label="Antigüedad" value={antiguedad} editMode={false} editor={null} />
            <EditField label="Jornada" value={form.jornada} editMode={isAdmin && editMode}
              editor={<select className="form-select text-sm" value={form.jornada} onChange={e => setForm(f => ({ ...f, jornada: e.target.value as typeof form.jornada }))}>
                <option>Full Time</option><option>Part Time</option><option>Por Horas</option>
              </select>} />
            <EditField label="Supervisor" value={form.supervisor || '—'} editMode={isAdmin && editMode}
              editor={<input className="form-input text-sm" value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))} />} />
            <EditField label="Estado" value={EMPLEADO_ESTADO_LABEL[form.estado as EmpleadoEstado] || form.estado} editMode={isAdmin && editMode}
              editor={<select className="form-select text-sm" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EmpleadoEstado }))}>
                <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
                <option value="licencia">En Licencia</option><option value="vacaciones">De Vacaciones</option>
              </select>} />
          </div>
        </div>
      )}

      {/* Tab: Documentos (Recibos) */}
      {tab === 2 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="section-title">Recibos de Sueldo</p>
            {isAdmin && (
              <Link href="/dashboard/recibos" className="btn-primary text-sm">
                <FileText className="w-4 h-4" /> Subir recibo
              </Link>
            )}
          </div>
          {misRecibos.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No hay recibos disponibles.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {misRecibos.map(r => (
                <div key={r.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-brand-700 dark:text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{formatMes(r.mes, r.anio)}</p>
                    <p className="text-xs text-slate-400">Subido: {formatFecha(r.fechaSubida)} · {formatMonto(r.monto)}</p>
                  </div>
                  {r.archivoUrl ? (
                    <a
                      href={r.archivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm py-1.5 inline-flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" /> Ver PDF
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 px-2">Sin archivo</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Solicitudes */}
      {tab === 3 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <p className="section-title">Solicitudes</p>
            <p className="section-subtitle">{misSolicitudes.length} solicitudes registradas</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {misSolicitudes.length === 0 ? (
              <div className="p-10 text-center">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Sin solicitudes registradas.</p>
              </div>
            ) : misSolicitudes.map(sol => (
              <div key={sol.id} className="p-4 flex items-start gap-3">
                <span className={`badge ${SOLICITUD_ESTADO_COLOR[sol.estado]} mt-0.5`}>
                  {SOLICITUD_ESTADO_LABEL[sol.estado]}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-slate-700 dark:text-slate-200">{SOLICITUD_TIPO_LABEL[sol.tipo]}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sol.descripcion}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatFecha(sol.fechaInicio)}{sol.fechaFin ? ` al ${formatFecha(sol.fechaFin)}` : ''}
                    · Creada: {formatFecha(sol.fechaCreacion)}
                  </p>
                  {sol.comentarioAdmin && (
                    <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 italic">RRHH: {sol.comentarioAdmin}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Historial */}
      {tab === 4 && (
        <div className="card p-5">
          <p className="section-title mb-4">Historial de Actividad</p>
          {misSolicitudes.length === 0 && misRecibos.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Sin actividad registrada aún.</p>
          ) : (
            <div className="space-y-4">
              {[
                ...misRecibos.slice(0, 3).map(r => ({
                  fecha: r.fechaSubida,
                  desc: `Recibo de ${formatMes(r.mes, r.anio)} disponible`,
                })),
                ...misSolicitudes.slice(0, 4).map(s => ({
                  fecha: s.fechaCreacion,
                  desc: `Solicitud de ${SOLICITUD_TIPO_LABEL[s.tipo]}: ${SOLICITUD_ESTADO_LABEL[s.estado]}`,
                })),
              ].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-700 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.desc}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatFecha(item.fecha)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EditField({ label, value, editMode, editor }: {
  label: string
  value: string
  editMode: boolean
  editor: React.ReactNode
}) {
  return (
    <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">{label}</span>
      {editMode && editor ? editor : (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>
      )}
    </div>
  )
}
