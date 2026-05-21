'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { empleados, recibos, solicitudes, SECTORES } from '@/lib/mockData'
import {
  EMPLEADO_ESTADO_COLOR, EMPLEADO_ESTADO_LABEL, SOLICITUD_TIPO_LABEL,
  SOLICITUD_ESTADO_COLOR, SOLICITUD_ESTADO_LABEL, formatFecha, formatMes,
  formatMonto, calcularAntiguedad, calcularEdad,
} from '@/lib/utils'
import {
  ArrowLeft, Edit2, Mail, Phone, MapPin, Calendar, Building2,
  FileText, ClipboardList, Clock, Download, User, Save, X,
  Shield, Users, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

const TABS = ['Personal', 'Laboral', 'Documentos', 'Solicitudes', 'Historial']

export default function EmpleadoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [editMode, setEditMode] = useState(false)

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
  const edad = calcularEdad(emp.fechaNacimiento)
  const antiguedad = calcularAntiguedad(emp.fechaIngreso)
  const diasRestantes = emp.diasVacaciones - emp.diasVacacionesUsados

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
        <div className="h-24 bg-gradient-to-r from-brand-700 to-brand-500" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl bg-brand-700 border-4 border-white dark:border-slate-900 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
              </div>
              <div className="mb-2">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{emp.nombre} {emp.apellido}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{emp.cargo} · {emp.sector}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge text-sm py-1 px-3 ${EMPLEADO_ESTADO_COLOR[emp.estado]}`}>
                {EMPLEADO_ESTADO_LABEL[emp.estado]}
              </span>
              {isAdmin && (
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={editMode ? 'btn-primary' : 'btn-secondary'}
                >
                  {editMode ? <><Save className="w-4 h-4" /> Guardar</> : <><Edit2 className="w-4 h-4" /> Editar</>}
                </button>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Antigüedad', value: antiguedad, icon: Calendar },
              { label: 'Vacaciones restantes', value: `${diasRestantes} días`, icon: CheckCircle2 },
              { label: 'Contrato', value: emp.tipoContrato, icon: Shield },
              { label: 'Jornada', value: emp.jornada, icon: Clock },
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

      {/* Tab content */}
      {tab === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <p className="section-title mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Datos Personales</p>
            <div className="space-y-3">
              {[
                { label: 'Nombre completo', value: `${emp.nombre} ${emp.apellido}`, editable: false },
                { label: 'DNI', value: emp.dni, editable: false },
                { label: 'Fecha de nacimiento', value: `${formatFecha(emp.fechaNacimiento)} (${edad} años)`, editable: false },
                { label: 'Email', value: emp.email, editable: false },
                { label: 'Teléfono', value: emp.telefono, editable: editMode },
                { label: 'Dirección', value: emp.direccion, editable: editMode },
              ].map(({ label, value, editable }) => (
                <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-44 shrink-0">{label}</span>
                  {editable ? (
                    <input defaultValue={value} className="form-input text-sm flex-1" />
                  ) : (
                    <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <p className="section-title mb-4 flex items-center gap-2"><Phone className="w-4 h-4" /> Contacto de Emergencia</p>
            <div className="space-y-3">
              {[
                { label: 'Nombre', value: emp.contactoEmergencia.nombre },
                { label: 'Teléfono', value: emp.contactoEmergencia.telefono },
                { label: 'Relación', value: emp.contactoEmergencia.relacion },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:w-28 shrink-0">{label}</span>
                  {editMode ? (
                    <input defaultValue={value} className="form-input text-sm flex-1" />
                  ) : (
                    <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="card p-5">
          <p className="section-title mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Datos Laborales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              { label: 'Sector', value: emp.sector, editable: isAdmin, type: 'select', options: SECTORES },
              { label: 'Cargo', value: emp.cargo, editable: isAdmin },
              { label: 'Fecha de ingreso', value: formatFecha(emp.fechaIngreso), editable: false },
              { label: 'Antigüedad', value: antiguedad, editable: false },
              { label: 'Tipo de contrato', value: emp.tipoContrato, editable: isAdmin },
              { label: 'Jornada', value: emp.jornada, editable: isAdmin },
              { label: 'Supervisor', value: emp.supervisor, editable: isAdmin },
              { label: 'Estado', value: EMPLEADO_ESTADO_LABEL[emp.estado], editable: isAdmin },
              { label: 'Días de vacaciones', value: `${emp.diasVacaciones} (usados: ${emp.diasVacacionesUsados})`, editable: false },
            ].map(({ label, value, editable, type, options }) => (
              <div key={label} className="py-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">{label}</span>
                {editable && editMode ? (
                  type === 'select' && options ? (
                    <select className="form-select text-sm">
                      {options.map(o => <option key={o} selected={o === value}>{o}</option>)}
                    </select>
                  ) : (
                    <input defaultValue={value} className="form-input text-sm" />
                  )
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="section-title">Recibos de Sueldo</p>
            {isAdmin && <button className="btn-primary text-sm"><FileText className="w-4 h-4" /> Subir recibo</button>}
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
                  <button className="btn-secondary text-sm py-1.5">
                    <Download className="w-4 h-4" /> Descargar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                    <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 italic">Resp: {sol.comentarioAdmin}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 4 && (
        <div className="card p-5">
          <p className="section-title mb-4">Historial de Actividad</p>
          <div className="space-y-4">
            {[
              { fecha: '2026-05-05', desc: 'Recibo de sueldo de Abril 2026 subido al sistema', tipo: 'recibo' },
              { fecha: '2026-04-11', desc: 'Solicitud de licencia médica aprobada', tipo: 'solicitud' },
              { fecha: '2026-03-01', desc: 'Datos laborales actualizados por RRHH', tipo: 'actualizacion' },
              { fecha: '2026-01-15', desc: 'Acreditación de vacaciones: 7 días utilizados', tipo: 'vacaciones' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-700 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{item.desc}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatFecha(item.fecha)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
