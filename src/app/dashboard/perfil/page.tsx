'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { formatFecha, calcularAntiguedad, calcularEdad, diasRestantesVacaciones } from '@/lib/utils'
import {
  User, Edit2, Save, X, Lock, Bell, Shield, Calendar, Building2,
  Phone, MapPin, Mail, Clock, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'

export default function PerfilPage() {
  const { empleado, updateEmpleado } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [editPass, setEditPass] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const [form, setForm] = useState({
    telefono: empleado?.telefono ?? '',
    direccion: empleado?.direccion ?? '',
    contactoNombre: empleado?.contactoEmergencia.nombre ?? '',
    contactoTelefono: empleado?.contactoEmergencia.telefono ?? '',
    contactoRelacion: empleado?.contactoEmergencia.relacion ?? '',
  })

  if (!empleado) return null

  const diasRestantes = diasRestantesVacaciones(empleado.diasVacaciones, empleado.diasVacacionesUsados)
  const edad = calcularEdad(empleado.fechaNacimiento)
  const antiguedad = calcularAntiguedad(empleado.fechaIngreso)

  function handleSave() {
    updateEmpleado({
      telefono: form.telefono,
      direccion: form.direccion,
      contactoEmergencia: {
        nombre: form.contactoNombre,
        telefono: form.contactoTelefono,
        relacion: form.contactoRelacion,
      },
    })
    setEditMode(false)
  }

  return (
    <div className="page-container max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mi Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Tu información personal y laboral</p>
      </div>

      {/* Profile card */}
      <div className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-700 to-brand-500" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-brand-700 border-4 border-white dark:border-slate-900 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                {empleado.nombre.charAt(0)}{empleado.apellido.charAt(0)}
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
                <button onClick={() => setEditMode(false)} className="btn-secondary"><X className="w-4 h-4" /> Cancelar</button>
                <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4" /> Guardar</button>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Antigüedad', value: antiguedad, icon: Clock },
              { label: 'Vacaciones disponibles', value: `${diasRestantes} días`, icon: Calendar },
              { label: 'Edad', value: `${edad} años`, icon: User },
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
            {[
              { label: 'Nombre completo', value: `${empleado.nombre} ${empleado.apellido}`, editable: false, icon: User },
              { label: 'DNI', value: empleado.dni, editable: false, icon: Shield },
              { label: 'Fecha de nacimiento', value: `${formatFecha(empleado.fechaNacimiento)} (${edad} años)`, editable: false, icon: Calendar },
              { label: 'Email', value: empleado.email, editable: false, icon: Mail },
            ].map(({ label, value, editable, icon: Icon }) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
                  {editable && editMode ? (
                    <input className="form-input text-sm" defaultValue={value} />
                  ) : (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</p>
                  )}
                </div>
              </div>
            ))}
            {/* Editable fields */}
            <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Teléfono</p>
                {editMode ? (
                  <input className="form-input text-sm" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                ) : (
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.telefono}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Dirección</p>
                {editMode ? (
                  <input className="form-input text-sm" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                ) : (
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.direccion}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Datos laborales */}
          <div className="card p-5">
            <p className="section-title mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Datos Laborales</p>
            <div className="space-y-2.5">
              {[
                { label: 'Sector', value: empleado.sector },
                { label: 'Cargo', value: empleado.cargo },
                { label: 'Fecha de ingreso', value: formatFecha(empleado.fechaIngreso) },
                { label: 'Tipo de contrato', value: empleado.tipoContrato },
                { label: 'Supervisor/a', value: empleado.supervisor },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-right max-w-[55%]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contacto emergencia */}
          <div className="card p-5">
            <p className="section-title mb-4 flex items-center gap-2"><Phone className="w-4 h-4" /> Contacto de Emergencia</p>
            <div className="space-y-2.5">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Nombre</p>
                {editMode ? (
                  <input className="form-input text-sm" value={form.contactoNombre} onChange={e => setForm(f => ({ ...f, contactoNombre: e.target.value }))} />
                ) : (
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.contactoEmergencia.nombre}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Teléfono</p>
                {editMode ? (
                  <input className="form-input text-sm" value={form.contactoTelefono} onChange={e => setForm(f => ({ ...f, contactoTelefono: e.target.value }))} />
                ) : (
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.contactoEmergencia.telefono}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Relación</p>
                {editMode ? (
                  <input className="form-input text-sm" value={form.contactoRelacion} onChange={e => setForm(f => ({ ...f, contactoRelacion: e.target.value }))} />
                ) : (
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{empleado.contactoEmergencia.relacion}</p>
                )}
              </div>
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
            <div>
              <label className="form-label">Contraseña actual</label>
              <div className="relative">
                <input type={showOld ? 'text' : 'password'} className="form-input pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Nueva contraseña</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} className="form-input pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Confirmar nueva contraseña</label>
              <input type="password" className="form-input" placeholder="••••••••" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditPass(false)} className="btn-secondary">Cancelar</button>
              <button className="btn-primary"><CheckCircle2 className="w-4 h-4" /> Actualizar contraseña</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tu contraseña fue actualizada por última vez hace 30 días. Recomendamos cambiarla cada 90 días.
          </p>
        )}
      </div>

      {/* Notificaciones */}
      <div className="card p-5">
        <p className="section-title mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Preferencias de Notificación</p>
        <div className="space-y-3">
          {[
            { label: 'Resolución de solicitudes', desc: 'Cuando una solicitud es aprobada o rechazada', default: true },
            { label: 'Nuevas novedades institucionales', desc: 'Cuando se publica un comunicado o novedad', default: true },
            { label: 'Disponibilidad de recibos', desc: 'Cuando tu recibo de sueldo está listo', default: true },
            { label: 'Recordatorios de vencimientos', desc: 'Alertas de fechas importantes', default: false },
          ].map(({ label, desc, default: checked }) => (
            <label key={label} className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5">
                <input type="checkbox" defaultChecked={checked} className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
