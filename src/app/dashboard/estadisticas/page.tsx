'use client'

import { useMemo, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { useRouter } from 'next/navigation'
import { SOLICITUD_TIPO_LABEL } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { TrendingUp, Users, ClipboardList, CalendarCheck, Download, BarChart3 } from 'lucide-react'
import * as XLSX from 'xlsx'

const COLORS = ['#1e3a5f', '#3b73b8', '#5988c3', '#9eb9dc', '#c5d5ea', '#10b981', '#f59e0b', '#ef4444']

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_COMPLETOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function EstadisticasPage() {
  const { user } = useAuth()
  const { empleados, solicitudes, recibos } = useData()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  const totalEmpleados = empleados.length
  const activos = empleados.filter(e => e.estado === 'activo').length
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobado').length
  const sectoresActivos = new Set(empleados.map(e => e.sector).filter(Boolean)).size

  // ── Item 16: Sector labels sin truncar ─────────────────────────────────────
  const empleadosPorSector = Array.from(
    empleados.reduce((map, e) => {
      if (!e.sector) return map
      // Usar nombre completo del sector (ya no ".split(' ')[0]")
      map.set(e.sector, (map.get(e.sector) || 0) + 1)
      return map
    }, new Map<string, number>())
  ).map(([sector, cantidad]) => ({ sector, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)

  const solicitudesPorTipo = Object.entries(
    solicitudes.reduce((acc, s) => {
      acc[s.tipo] = (acc[s.tipo] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([tipo, cantidad]) => ({
    tipo: SOLICITUD_TIPO_LABEL[tipo as keyof typeof SOLICITUD_TIPO_LABEL] ?? tipo,
    cantidad,
  })).sort((a, b) => b.cantidad - a.cantidad)

  const tasaAprobacion = solicitudes.length > 0
    ? Math.round(aprobadas / solicitudes.length * 100)
    : 0

  // ── Item 15: Evolución mensual con datos reales ─────────────────────────────
  const estadisticasMensuales = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return MESES_CORTOS.map((mes, idx) => {
      const monthNum = idx + 1
      // Empleados activos al mes (empleados cuyo ingreso es <= ese mes)
      const empActivos = empleados.filter(e => {
        if (!e.fechaIngreso) return true
        const [y, m] = e.fechaIngreso.split('-').map(Number)
        return y < currentYear || (y === currentYear && m <= monthNum)
      }).length

      // Solicitudes creadas ese mes/año
      const solMes = solicitudes.filter(s => {
        const [y, m] = s.fechaCreacion.split('-').map(Number)
        return y === currentYear && m === monthNum
      }).length

      // Ausencias = solicitudes de tipo ausencia/licencia aprobadas ese mes
      const ausenciasMes = solicitudes.filter(s => {
        const [y, m] = s.fechaCreacion.split('-').map(Number)
        return y === currentYear && m === monthNum && s.estado === 'aprobado' &&
          ['ausencia', 'licencia_medica', 'licencia_duelo', 'licencia_estudio', 'licencia_maternidad_paternidad'].includes(s.tipo)
      }).length

      return { mes, empleados: empActivos, solicitudes: solMes, ausencias: ausenciasMes }
    })
  }, [empleados, solicitudes])

  // ── Item 13: Exportar informe Excel ────────────────────────────────────────
  function exportarInforme() {
    const wb = XLSX.utils.book_new()

    // Hoja 1: KPIs
    const kpiData = [
      ['Indicador', 'Valor'],
      ['Total Empleados', totalEmpleados],
      ['Empleados Activos', activos],
      ['Total Solicitudes', solicitudes.length],
      ['Solicitudes Pendientes', pendientes],
      ['Solicitudes Aprobadas', aprobadas],
      ['Tasa de Aprobación', `${tasaAprobacion}%`],
      ['Sectores Activos', sectoresActivos],
    ]
    const wsKpi = XLSX.utils.aoa_to_sheet(kpiData)
    XLSX.utils.book_append_sheet(wb, wsKpi, 'Resumen KPIs')

    // Hoja 2: Empleados por sector
    const sectorData = [
      ['Sector', 'Cantidad'],
      ...empleadosPorSector.map(r => [r.sector, r.cantidad]),
    ]
    const wsSector = XLSX.utils.aoa_to_sheet(sectorData)
    XLSX.utils.book_append_sheet(wb, wsSector, 'Por Sector')

    // Hoja 3: Solicitudes por tipo
    const tipoData = [
      ['Tipo', 'Cantidad'],
      ...solicitudesPorTipo.map(r => [r.tipo, r.cantidad]),
    ]
    const wsTipo = XLSX.utils.aoa_to_sheet(tipoData)
    XLSX.utils.book_append_sheet(wb, wsTipo, 'Por Tipo')

    // Hoja 4: Evolución mensual
    const mensualData = [
      ['Mes', 'Empleados', 'Solicitudes', 'Ausencias'],
      ...estadisticasMensuales.map(r => [r.mes, r.empleados, r.solicitudes, r.ausencias]),
    ]
    const wsMensual = XLSX.utils.aoa_to_sheet(mensualData)
    XLSX.utils.book_append_sheet(wb, wsMensual, 'Evolución Mensual')

    // Hoja 5: Detalle empleados
    const empData = [
      ['Apellido', 'Nombre', 'DNI', 'Cargo', 'Sector', 'Estado', 'Ingreso', 'Solicitudes', 'Aprobadas'],
      ...empleados.filter(e => e.id !== '1').map(emp => {
        const mSol = solicitudes.filter(s => s.empleadoId === emp.id)
        return [
          emp.apellido, emp.nombre, emp.dni ?? '', emp.cargo, emp.sector,
          emp.estado, emp.fechaIngreso ?? '',
          mSol.length, mSol.filter(s => s.estado === 'aprobado').length,
        ]
      }),
    ]
    const wsEmp = XLSX.utils.aoa_to_sheet(empData)
    XLSX.utils.book_append_sheet(wb, wsEmp, 'Detalle Empleados')

    const fecha = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `informe_rrhh_${fecha}.xlsx`)
  }

  // ── Item 14: Exportar CSV de empleados ─────────────────────────────────────
  function exportarCSV() {
    const headers = ['Apellido', 'Nombre', 'DNI', 'CUIL', 'Cargo', 'Sector', 'Estado', 'Fecha Ingreso', 'Email', 'Teléfono', 'Solicitudes', 'Solicitudes Aprobadas']
    const rows = empleados.filter(e => e.id !== '1').map(emp => {
      const mSol = solicitudes.filter(s => s.empleadoId === emp.id)
      return [
        emp.apellido,
        emp.nombre,
        emp.dni ?? '',
        emp.cuil ?? '',
        emp.cargo,
        emp.sector,
        emp.estado,
        emp.fechaIngreso ?? '',
        emp.email ?? '',
        emp.telefono ?? '',
        mSol.length,
        mSol.filter(s => s.estado === 'aprobado').length,
      ]
    })

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `empleados_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Acortar label del sector para el eje X del chart (máx 12 chars)
  function shortSector(s: string) {
    return s.length > 12 ? s.slice(0, 11) + '…' : s
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Estadísticas e Indicadores</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Métricas clave de Recursos Humanos — {new Date().getFullYear()}
          </p>
        </div>
        <button onClick={exportarInforme} className="btn-primary">
          <Download className="w-4 h-4" /> Exportar informe (.xlsx)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Empleados', value: totalEmpleados, sub: `${activos} activos`, icon: Users, color: 'text-brand-700 dark:text-brand-400 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Solicitudes Totales', value: solicitudes.length, sub: `${pendientes} pendientes`, icon: ClipboardList, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Tasa de Aprobación', value: `${tasaAprobacion}%`, sub: `${aprobadas} aprobadas`, icon: CalendarCheck, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Sectores Activos', value: sectoresActivos, sub: 'Unidades de trabajo', icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
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
          {empleadosPorSector.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin empleados cargados</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={empleadosPorSector.map(d => ({ ...d, sectorCorto: shortSector(d.sector) }))}
                margin={{ top: 4, right: 4, left: -20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="sectorCorto"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [v, 'Empleados']}
                  labelFormatter={(label) => {
                    const orig = empleadosPorSector.find(d => shortSector(d.sector) === label)
                    return orig?.sector ?? label
                  }}
                />
                <Bar dataKey="cantidad" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Solicitudes por tipo */}
        <div className="card p-5">
          <div className="mb-5">
            <p className="section-title">Solicitudes por Tipo</p>
            <p className="section-subtitle">Total registradas en el sistema</p>
          </div>
          {solicitudesPorTipo.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <div className="text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin solicitudes aún</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <ResponsiveContainer width="50%" height={240}>
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
              <div className="space-y-1.5 flex-1 overflow-hidden">
                {solicitudesPorTipo.slice(0, 8).map((item, i) => (
                  <div key={item.tipo} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1" title={item.tipo}>{item.tipo}</p>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">{item.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2: Evolución mensual con datos reales */}
      <div className="card p-5">
        <div className="mb-5">
          <p className="section-title">Evolución Mensual — {new Date().getFullYear()}</p>
          <p className="section-subtitle">Solicitudes y ausencias aprobadas por mes (datos reales)</p>
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
            <Line type="monotone" dataKey="ausencias" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Ausencias aprobadas" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      {empleados.filter(e => e.id !== '1').length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="section-title">Detalle por Empleado</p>
            <button onClick={exportarCSV} className="btn-secondary text-sm">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left">Empleado</th>
                  <th className="table-header text-left">Sector</th>
                  <th className="table-header text-center">Solicitudes</th>
                  <th className="table-header text-center">Aprobadas</th>
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
                          <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                            {emp.foto ? <img src={emp.foto} alt="" className="w-8 h-8 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{emp.nombre} {emp.apellido}</span>
                        </div>
                      </td>
                      <td className="table-cell text-slate-600 dark:text-slate-400 text-sm max-w-[160px] truncate" title={emp.sector}>{emp.sector}</td>
                      <td className="table-cell text-center font-semibold text-slate-700 dark:text-slate-300">{mSolicitudes.length}</td>
                      <td className="table-cell text-center font-semibold text-emerald-600">{mAprobadas}</td>
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
      )}
    </div>
  )
}
