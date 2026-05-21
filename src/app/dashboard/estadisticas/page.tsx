'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { empleados, solicitudes, estadisticasMensuales, empleadosPorSector } from '@/lib/mockData'
import { SOLICITUD_TIPO_LABEL } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { TrendingUp, Users, ClipboardList, CalendarCheck, Download, BarChart3 } from 'lucide-react'

const COLORS = ['#1e3a5f', '#3b73b8', '#5988c3', '#9eb9dc', '#c5d5ea', '#10b981', '#f59e0b', '#ef4444']

const solicitudesPorTipo = Object.entries(
  solicitudes.reduce((acc, s) => {
    acc[s.tipo] = (acc[s.tipo] || 0) + 1
    return acc
  }, {} as Record<string, number>)
).map(([tipo, cantidad]) => ({
  tipo: SOLICITUD_TIPO_LABEL[tipo as keyof typeof SOLICITUD_TIPO_LABEL],
  cantidad,
}))

export default function EstadisticasPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (user?.role !== 'admin') {
    router.replace('/dashboard')
    return null
  }

  const totalEmpleados = empleados.length
  const activos = empleados.filter(e => e.estado === 'activo').length
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobado').length

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Estadísticas e Indicadores</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Métricas clave de Recursos Humanos — Mayo 2026
          </p>
        </div>
        <button className="btn-secondary">
          <Download className="w-4 h-4" /> Exportar informe
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Empleados', value: totalEmpleados, sub: `${activos} activos`, icon: Users, color: 'text-brand-700 dark:text-brand-400 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Solicitudes Totales', value: solicitudes.length, sub: `${pendientes} pendientes`, icon: ClipboardList, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Solicitudes Aprobadas', value: aprobadas, sub: `${Math.round(aprobadas / solicitudes.length * 100)}% de aprobación`, icon: CalendarCheck, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Sectores Activos', value: 6, sub: 'Unidades de trabajo', icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empleados por sector */}
        <div className="card p-5">
          <div className="mb-5">
            <p className="section-title">Empleados por Sector</p>
            <p className="section-subtitle">Distribución del personal</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={empleadosPorSector} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="sector" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v, 'Empleados']}
              />
              <Bar dataKey="cantidad" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Solicitudes por tipo */}
        <div className="card p-5">
          <div className="mb-5">
            <p className="section-title">Solicitudes por Tipo</p>
            <p className="section-subtitle">Total registradas en el sistema</p>
          </div>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie
                  data={solicitudesPorTipo}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="cantidad"
                >
                  {solicitudesPorTipo.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {solicitudesPorTipo.map((item, i) => (
                <div key={item.tipo} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{item.tipo}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.cantidad}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolución mensual */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-5">
            <p className="section-title">Evolución Mensual — 2026</p>
            <p className="section-subtitle">Empleados, ausencias y solicitudes por mes</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={estadisticasMensuales} margin={{ top: 4, right: 20, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Line type="monotone" dataKey="empleados" stroke="#1e3a5f" strokeWidth={2.5} dot={{ r: 4 }} name="Empleados" />
              <Line type="monotone" dataKey="solicitudes" stroke="#3b73b8" strokeWidth={2.5} dot={{ r: 4 }} name="Solicitudes" strokeDasharray="5 3" />
              <Line type="monotone" dataKey="ausencias" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Ausencias" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="section-title">Detalle por Empleado</p>
          <button className="btn-secondary text-sm"><Download className="w-4 h-4" /> Exportar CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Empleado</th>
                <th className="table-header text-left">Sector</th>
                <th className="table-header text-center">Solicitudes</th>
                <th className="table-header text-center">Aprobadas</th>
                <th className="table-header text-center">Vac. usadas</th>
                <th className="table-header text-center">Vac. restantes</th>
                <th className="table-header text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {empleados.filter(e => e.id !== '1').map(emp => {
                const mSolicitudes = solicitudes.filter(s => s.empleadoId === emp.id)
                const mAprobadas = mSolicitudes.filter(s => s.estado === 'aprobado').length
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{emp.nombre} {emp.apellido}</span>
                      </div>
                    </td>
                    <td className="table-cell text-slate-600 dark:text-slate-400">{emp.sector}</td>
                    <td className="table-cell text-center font-semibold text-slate-700 dark:text-slate-300">{mSolicitudes.length}</td>
                    <td className="table-cell text-center font-semibold text-emerald-600">{mAprobadas}</td>
                    <td className="table-cell text-center text-slate-600 dark:text-slate-400">{emp.diasVacacionesUsados}</td>
                    <td className="table-cell text-center font-semibold text-brand-700 dark:text-brand-400">
                      {emp.diasVacaciones - emp.diasVacacionesUsados}
                    </td>
                    <td className="table-cell">
                      <span className={`badge text-xs ${
                        emp.estado === 'activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        emp.estado === 'licencia' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        emp.estado === 'vacaciones' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {emp.estado.charAt(0).toUpperCase() + emp.estado.slice(1)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
