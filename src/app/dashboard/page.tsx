'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  empleados, solicitudes, novedades, recibos, eventos,
} from '@/lib/mockData'
import {
  SOLICITUD_ESTADO_COLOR, SOLICITUD_ESTADO_LABEL, SOLICITUD_TIPO_LABEL,
  NOVEDAD_CATEGORIA_COLOR, NOVEDAD_CATEGORIA_LABEL, formatFecha, formatMes,
  diasRestantesVacaciones,
} from '@/lib/utils'
import {
  Users, ClipboardList, CalendarCheck, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Clock, Download, PartyPopper, Bell,
  ArrowRight, FileText, HeadphonesIcon, Plus,
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, empleado } = useAuth()
  const isAdmin = user?.role === 'admin'

  const hoy = new Date()
  const horaActual = hoy.getHours()
  const saludo = horaActual < 12 ? 'Buenos días' : horaActual < 18 ? 'Buenas tardes' : 'Buenas noches'
  const fechaStr = hoy.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (isAdmin) return <AdminDashboard saludo={saludo} fechaStr={fechaStr} />
  return <EmployeeDashboard saludo={saludo} fechaStr={fechaStr} empleadoId={user?.empleadoId ?? ''} />
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType, label: string, value: string | number, sub?: string, color: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{label}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function AdminDashboard({ saludo, fechaStr }: { saludo: string, fechaStr: string }) {
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente')
  const activos = empleados.filter(e => e.estado === 'activo').length
  const enLicencia = empleados.filter(e => e.estado === 'licencia' || e.estado === 'vacaciones').length

  const proximosCumples = eventos.filter(e => {
    if (e.tipo !== 'cumpleanos') return false
    const emp = empleados.find(em => em.id === e.empleadoId)
    if (!emp) return false
    const nac = new Date(emp.fechaNacimiento)
    const hoy = new Date()
    const proximo = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())
    if (proximo < hoy) proximo.setFullYear(hoy.getFullYear() + 1)
    return (proximo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24) <= 30
  })

  return (
    <div className="page-container">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {saludo}, <span className="text-brand-700 dark:text-brand-400">Administrador</span> 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 capitalize">{fechaStr}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/empleados" className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Empleado
          </Link>
          <Link href="/dashboard/solicitudes" className="btn-secondary">
            {pendientes.length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendientes.length}
              </span>
            )}
            Solicitudes
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total empleados" value={empleados.length}
          sub={`${activos} activos`} color="bg-blue-50 dark:bg-blue-900/20 text-brand-700 dark:text-brand-400" />
        <StatCard icon={ClipboardList} label="Solicitudes pendientes" value={pendientes.length}
          sub="Requieren revisión" color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />
        <StatCard icon={CalendarCheck} label="Fuera de oficina" value={enLicencia}
          sub="Licencia o vacaciones" color="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" />
        <StatCard icon={TrendingUp} label="Sectores activos" value={6}
          sub="Unidades de trabajo" color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Solicitudes pendientes */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="section-title">Solicitudes Pendientes</p>
              <p className="section-subtitle">{pendientes.length} requieren tu atención</p>
            </div>
            <Link href="/dashboard/solicitudes" className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendientes.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">¡Sin solicitudes pendientes!</p>
              </div>
            ) : pendientes.slice(0, 4).map(sol => {
              const emp = empleados.find(e => e.id === sol.empleadoId)
              return (
                <div key={sol.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {emp ? `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}` : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {emp ? `${emp.nombre} ${emp.apellido}` : 'Empleado'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {SOLICITUD_TIPO_LABEL[sol.tipo]} · {formatFecha(sol.fechaInicio)}
                    </p>
                  </div>
                  <span className={`badge ${SOLICITUD_ESTADO_COLOR[sol.estado]} hidden sm:inline-flex`}>
                    {SOLICITUD_ESTADO_LABEL[sol.estado]}
                  </span>
                  <Link
                    href="/dashboard/solicitudes"
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* Aside column */}
        <div className="space-y-6">
          {/* Cumpleaños */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <PartyPopper className="w-4.5 h-4.5 text-pink-500" />
              <p className="section-title text-base">Próximos cumpleaños</p>
            </div>
            {proximosCumples.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-2">Sin cumpleaños este mes</p>
            ) : (
              <div className="space-y-3">
                {proximosCumples.map(ev => {
                  const emp = empleados.find(e => e.id === ev.empleadoId)
                  if (!emp) return null
                  return (
                    <div key={ev.id} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-xs font-bold shrink-0">
                        {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emp.nombre} {emp.apellido}</p>
                        <p className="text-xs text-slate-400">{emp.fechaNacimiento.slice(5).split('-').reverse().join('/')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="card p-5">
            <p className="section-title text-base mb-4">Accesos Rápidos</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Subir recibo', href: '/dashboard/recibos', icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Ver empleados', href: '/dashboard/empleados', icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
                { label: 'Comunicar', href: '/dashboard/comunicaciones', icon: Bell, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Estadísticas', href: '/dashboard/estadisticas', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:shadow-card transition-all group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Últimas novedades */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="section-title">Últimas Novedades</p>
          <Link href="/dashboard/comunicaciones" className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {novedades.slice(0, 3).map(n => (
            <div key={n.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              {n.importante && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{n.titulo}</p>
                  <span className={`badge ${NOVEDAD_CATEGORIA_COLOR[n.categoria]}`}>
                    {NOVEDAD_CATEGORIA_LABEL[n.categoria]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{n.contenido}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatFecha(n.fechaPublicacion)} · {n.autor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmployeeDashboard({ saludo, fechaStr, empleadoId }: { saludo: string, fechaStr: string, empleadoId: string }) {
  const { empleado } = useAuth()
  const misSolicitudes = solicitudes.filter(s => s.empleadoId === empleadoId)
  const misPendientes = misSolicitudes.filter(s => s.estado === 'pendiente')
  const misRecibos = recibos.filter(r => r.empleadoId === empleadoId).sort((a, b) => b.anio - a.anio || b.mes - a.mes)
  const ultimoRecibo = misRecibos[0]
  const diasRestantes = empleado ? diasRestantesVacaciones(empleado.diasVacaciones, empleado.diasVacacionesUsados) : 0

  return (
    <div className="page-container">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-500 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm font-medium capitalize">{fechaStr}</p>
        <h1 className="text-2xl font-bold mt-1">
          {saludo}, <span className="text-white">{empleado?.nombre}</span> 👋
        </h1>
        <p className="text-blue-100/80 text-sm mt-1">{empleado?.cargo} · {empleado?.sector}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={CalendarCheck} label="Días de vacaciones" value={diasRestantes}
          sub={`de ${empleado?.diasVacaciones} disponibles`} color="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" />
        <StatCard icon={ClipboardList} label="Solicitudes pendientes" value={misPendientes.length}
          sub="En espera de resolución" color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />
        <StatCard icon={FileText} label="Último recibo" value={ultimoRecibo ? formatMes(ultimoRecibo.mes, ultimoRecibo.anio) : 'N/A'}
          sub={ultimoRecibo ? `Subido el ${formatFecha(ultimoRecibo.fechaSubida)}` : 'Sin recibos'} color="bg-blue-50 dark:bg-blue-900/20 text-brand-700 dark:text-brand-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mis solicitudes */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="section-title">Mis Solicitudes Recientes</p>
            <Link href="/dashboard/solicitudes" className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {misSolicitudes.length === 0 ? (
              <div className="p-8 text-center">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No tenés solicitudes aún.</p>
              </div>
            ) : misSolicitudes.slice(0, 4).map(sol => (
              <div key={sol.id} className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  sol.estado === 'aprobado' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                  sol.estado === 'rechazado' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                  'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                }`}>
                  {sol.estado === 'aprobado' ? <CheckCircle2 className="w-5 h-5" /> :
                   sol.estado === 'rechazado' ? <XCircle className="w-5 h-5" /> :
                   <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {SOLICITUD_TIPO_LABEL[sol.tipo]}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatFecha(sol.fechaInicio)}</p>
                </div>
                <span className={`badge ${SOLICITUD_ESTADO_COLOR[sol.estado]}`}>
                  {SOLICITUD_ESTADO_LABEL[sol.estado]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="space-y-6">
          <div className="card p-5">
            <p className="section-title text-base mb-4">Acciones Rápidas</p>
            <div className="space-y-2">
              {[
                { label: 'Nueva solicitud', href: '/dashboard/solicitudes', icon: Plus, color: 'btn-primary' },
                { label: 'Ver mis recibos', href: '/dashboard/recibos', icon: Download, color: 'btn-secondary' },
                { label: 'Portal RRHH', href: '/dashboard/portal-rrhh', icon: HeadphonesIcon, color: 'btn-secondary' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href} className={`${color} w-full justify-center`}>
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mis recibos */}
          <div className="card p-5">
            <p className="section-title text-base mb-3">Últimos Recibos</p>
            <div className="space-y-2">
              {misRecibos.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{formatMes(r.mes, r.anio)}</span>
                  <button className="flex items-center gap-1 text-brand-600 dark:text-brand-400 text-xs font-medium hover:underline">
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </button>
                </div>
              ))}
              {misRecibos.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-2">Sin recibos disponibles</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Novedades */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="section-title">Novedades Institucionales</p>
          <Link href="/dashboard/comunicaciones" className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {novedades.slice(0, 3).map(n => (
            <div key={n.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-start gap-2">
                {n.importante && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{n.titulo}</p>
                    <span className={`badge ${NOVEDAD_CATEGORIA_COLOR[n.categoria]}`}>
                      {NOVEDAD_CATEGORIA_LABEL[n.categoria]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.contenido}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatFecha(n.fechaPublicacion)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
