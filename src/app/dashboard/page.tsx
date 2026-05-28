'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import {
  SOLICITUD_ESTADO_COLOR, SOLICITUD_ESTADO_LABEL, SOLICITUD_TIPO_LABEL,
  NOVEDAD_CATEGORIA_COLOR, NOVEDAD_CATEGORIA_LABEL, formatFecha, formatMes,
  getBirthdayThisYear, EVENTO_TIPO_LABEL, EVENTO_TIPO_DOT, EVENTO_TIPO_COLOR,
} from '@/lib/utils'
import {
  Users, ClipboardList, CalendarCheck, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Clock, Download, PartyPopper, Bell,
  ArrowRight, FileText, HeadphonesIcon, Plus, UserPlus, Calendar,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()
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
  const { empleados, solicitudes, novedades, pendingRegistrations, approvePendingRegistration, rejectPendingRegistration } = useData()

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente')
  const activos = empleados.filter(e => e.estado === 'activo').length
  const enLicencia = empleados.filter(e => e.estado === 'licencia' || e.estado === 'vacaciones').length
  const sectoresActivos = new Set(empleados.map(e => e.sector).filter(Boolean)).size

  const hoy = new Date()
  const proximosCumples = empleados
    .filter(emp => emp.fechaNacimiento)
    .map(emp => ({ emp, cumple: getBirthdayThisYear(emp.fechaNacimiento) }))
    .filter(({ cumple }) => {
      const diff = (cumple.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 30
    })
    .sort((a, b) => a.cumple.getTime() - b.cumple.getTime())

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

      {/* Pending Registrations Alert */}
      {pendingRegistrations.length > 0 && (
        <div className="card border-l-4 border-amber-500 p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {pendingRegistrations.length} solicitud{pendingRegistrations.length > 1 ? 'es' : ''} de acceso pendiente{pendingRegistrations.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {pendingRegistrations.slice(0, 2).map(r => `${r.nombre} ${r.apellido}`).join(', ')}
                  {pendingRegistrations.length > 2 ? ` y ${pendingRegistrations.length - 2} más` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingRegistrations.slice(0, 3).map(reg => (
                <div key={reg.id} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                    {reg.nombre} {reg.apellido}
                  </span>
                  <button
                    onClick={() => approvePendingRegistration(reg.id)}
                    className="text-emerald-600 hover:text-emerald-700 p-0.5 shrink-0" title="Aprobar"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => rejectPendingRegistration(reg.id)}
                    className="text-red-500 hover:text-red-600 p-0.5 shrink-0" title="Rechazar"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {pendingRegistrations.length > 0 && (
                <Link href="/dashboard/empleados" className="text-xs text-brand-600 dark:text-brand-400 hover:underline self-center">
                  Ver todos →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total empleados" value={empleados.length}
          sub={`${activos} activos`} color="bg-blue-50 dark:bg-blue-900/20 text-brand-700 dark:text-brand-400" />
        <StatCard icon={ClipboardList} label="Solicitudes pendientes" value={pendientes.length}
          sub="Requieren revisión" color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />
        <StatCard icon={CalendarCheck} label="Fuera de oficina" value={enLicencia}
          sub="Licencia o vacaciones" color="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" />
        <StatCard icon={TrendingUp} label="Sectores activos" value={sectoresActivos}
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
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                    {emp?.foto
                      ? <img src={emp.foto} alt="" className="w-9 h-9 object-cover" />
                      : emp ? `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}` : '?'
                    }
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
          {/* Próximos cumpleaños */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <PartyPopper className="w-4 h-4 text-pink-500" />
              <p className="section-title text-base">Próximos cumpleaños</p>
            </div>
            {proximosCumples.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-2">Sin cumpleaños en los próximos 30 días</p>
            ) : (
              <div className="space-y-3">
                {proximosCumples.slice(0, 5).map(({ emp, cumple }) => (
                  <div key={emp.id} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-xs font-bold shrink-0 overflow-hidden">
                      {emp.foto
                        ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" />
                        : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{emp.nombre} {emp.apellido}</p>
                      <p className="text-xs text-slate-400">
                        {cumple.getDate()}/{cumple.toLocaleDateString('es-AR', { month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
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
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:shadow-card transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
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
          {novedades.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Sin novedades publicadas aún</p>
            </div>
          ) : novedades.slice(0, 3).map(n => (
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
  const { solicitudes, recibos, novedades, eventos } = useData()

  const misSolicitudes = solicitudes.filter(s => s.empleadoId === empleadoId)
  const misPendientes = misSolicitudes.filter(s => s.estado === 'pendiente')
  const ultimoRecibo = recibos
    .filter(r => r.empleadoId === empleadoId)
    .sort((a, b) => b.anio - a.anio || b.mes - a.mes)[0]

  // Eventos próximos 30 días
  const hoy = new Date()
  const hoyMidnight = new Date(hoy); hoyMidnight.setHours(0, 0, 0, 0)
  const en30 = new Date(hoyMidnight); en30.setDate(hoyMidnight.getDate() + 30)
  const hoyStr = hoyMidnight.toISOString().slice(0, 10)
  const en30Str = en30.toISOString().slice(0, 10)
  const proximosEventos = eventos
    .filter(ev => ev.fecha >= hoyStr && ev.fecha <= en30Str)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <div className="page-container">

      {/* ── Welcome banner ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-500 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm font-medium capitalize">{fechaStr}</p>
        <h1 className="text-2xl font-bold mt-1">
          {saludo}, <span className="text-white">{empleado?.nombre}</span> 👋
        </h1>
        <p className="text-blue-100/80 text-sm mt-1">{empleado?.cargo} · {empleado?.sector}</p>
        {/* Mini stats inline */}
        <div className="flex gap-4 mt-4 flex-wrap">
          <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium text-white">
              {misPendientes.length} solicitud{misPendientes.length !== 1 ? 'es' : ''} pendiente{misPendientes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium text-white">
              {ultimoRecibo ? `Último recibo: ${formatMes(ultimoRecibo.mes, ultimoRecibo.anio)}` : 'Sin recibos aún'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Próximos eventos — sección protagonista ────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <div>
              <p className="section-title">📅 Próximos eventos</p>
              <p className="section-subtitle">Próximos 30 días</p>
            </div>
          </div>
          <Link href="/dashboard/eventos" className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
            Ver calendario <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {proximosEventos.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Sin eventos en los próximos 30 días</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            {proximosEventos.slice(0, 6).map(ev => {
              const evDate = new Date(ev.fecha + 'T00:00:00')
              const diffDays = Math.round((evDate.getTime() - hoyMidnight.getTime()) / (1000 * 60 * 60 * 24))
              const isHoy = diffDays === 0
              const esMañana = diffDays === 1
              return (
                <div key={ev.id} className={`p-4 flex items-start gap-3 ${isHoy ? 'bg-brand-50 dark:bg-brand-900/10' : ''}`}>
                  {/* Fecha visual */}
                  <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center border-2 ${
                    isHoy ? 'border-brand-500 bg-brand-700 text-white' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}>
                    <span className={`text-lg font-bold leading-none ${isHoy ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                      {evDate.getDate()}
                    </span>
                    <span className={`text-[10px] uppercase font-medium ${isHoy ? 'text-blue-200' : 'text-slate-400'}`}>
                      {evDate.toLocaleDateString('es-AR', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`badge text-xs mb-1 ${EVENTO_TIPO_COLOR[ev.tipo]}`}>
                      {EVENTO_TIPO_LABEL[ev.tipo]}
                    </span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">{ev.titulo}</p>
                    <p className={`text-xs font-medium mt-0.5 ${isHoy ? 'text-brand-600 dark:text-brand-400' : esMañana ? 'text-amber-600' : 'text-slate-400'}`}>
                      {isHoy ? '🔴 Hoy' : esMañana ? '🟡 Mañana' : `en ${diffDays} días`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Acciones rápidas — una por acción ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Nueva solicitud',   href: '/dashboard/solicitudes',  icon: Plus,           bg: 'bg-brand-700 hover:bg-brand-600 text-white',                         desc: 'Permisos, licencias...' },
          { label: 'Mis recibos',        href: '/dashboard/recibos',       icon: FileText,       bg: 'bg-emerald-600 hover:bg-emerald-500 text-white',                      desc: 'Ver y descargar PDF' },
          { label: 'Soporte RRHH',       href: '/dashboard/portal-rrhh',   icon: HeadphonesIcon, bg: 'bg-slate-700 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 text-white', desc: 'Consultas y tickets' },
          { label: 'La Fundación',       href: 'https://fundacionnqnoeste.com/', icon: ExternalLink, bg: 'bg-sky-600 hover:bg-sky-500 text-white', desc: 'Sitio institucional', external: true },
        ].map(({ label, href, icon: Icon, bg, desc, external }) => (
          external
            ? (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                className={`${bg} rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-colors shadow-sm`}>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{desc}</p>
                </div>
              </a>
            ) : (
              <Link key={href} href={href}
                className={`${bg} rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-colors shadow-sm`}>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{desc}</p>
                </div>
              </Link>
            )
        ))}
      </div>

      {/* ── Solicitudes recientes + Novedades ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solicitudes — compacto */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" /> Mis solicitudes
              {misPendientes.length > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {misPendientes.length}
                </span>
              )}
            </p>
            <Link href="/dashboard/solicitudes" className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {misSolicitudes.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-slate-400 text-sm">Sin solicitudes. ¿Necesitás algo?</p>
                <Link href="/dashboard/solicitudes" className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1 inline-block">
                  Crear una solicitud →
                </Link>
              </div>
            ) : misSolicitudes.slice(0, 3).map(sol => (
              <div key={sol.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  sol.estado === 'aprobado' ? 'bg-emerald-500' :
                  sol.estado === 'rechazado' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{SOLICITUD_TIPO_LABEL[sol.tipo]}</p>
                  <p className="text-xs text-slate-400">{formatFecha(sol.fechaInicio)}</p>
                </div>
                <span className={`badge text-xs ${SOLICITUD_ESTADO_COLOR[sol.estado]}`}>
                  {SOLICITUD_ESTADO_LABEL[sol.estado]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Novedades — compacto */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-500" /> Novedades
            </p>
            <Link href="/dashboard/comunicaciones" className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {novedades.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-slate-400 text-sm">Sin novedades publicadas</p>
              </div>
            ) : novedades.slice(0, 3).map(n => (
              <div key={n.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  {n.importante && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate flex-1">{n.titulo}</p>
                  <span className={`badge text-xs shrink-0 ${NOVEDAD_CATEGORIA_COLOR[n.categoria]}`}>
                    {NOVEDAD_CATEGORIA_LABEL[n.categoria]}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{formatFecha(n.fechaPublicacion)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
