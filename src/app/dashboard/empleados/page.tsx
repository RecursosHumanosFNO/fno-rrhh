'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { empleados as allEmpleados, SECTORES } from '@/lib/mockData'
import {
  EMPLEADO_ESTADO_COLOR, EMPLEADO_ESTADO_LABEL, formatFecha, calcularAntiguedad,
} from '@/lib/utils'
import {
  Search, Filter, Users, Plus, Download, LayoutGrid, List,
  Mail, Phone, Building2, Calendar, ChevronRight, X,
} from 'lucide-react'
import Link from 'next/link'

export default function EmpleadosPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (user?.role !== 'admin') {
    router.replace('/dashboard')
    return null
  }

  const [query, setQuery] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showNuevo, setShowNuevo] = useState(false)

  const filtered = allEmpleados.filter(e => {
    const matchQuery = `${e.nombre} ${e.apellido} ${e.cargo} ${e.email} ${e.dni}`.toLowerCase().includes(query.toLowerCase())
    const matchSector = !sectorFilter || e.sector === sectorFilter
    const matchEstado = !estadoFilter || e.estado === estadoFilter
    return matchQuery && matchSector && matchEstado
  })

  const hasFilters = !!query || !!sectorFilter || !!estadoFilter

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Empleados</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {allEmpleados.length} empleados en total · {allEmpleados.filter(e => e.estado === 'activo').length} activos
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowNuevo(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo empleado
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre, cargo, DNI..."
            className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none w-full"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          className="form-select w-auto text-sm"
          value={sectorFilter}
          onChange={e => setSectorFilter(e.target.value)}
        >
          <option value="">Todos los sectores</option>
          {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="form-select w-auto text-sm"
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="licencia">En Licencia</option>
          <option value="vacaciones">De Vacaciones</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setQuery(''); setSectorFilter(''); setEstadoFilter('') }}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-brand-700 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-brand-700 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron empleados</p>
          <p className="text-slate-400 text-sm mt-1">Probá con otros filtros de búsqueda</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => (
            <Link key={emp.id} href={`/dashboard/empleados/${emp.id}`} className="card-hover p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-brand-700 flex items-center justify-center text-white font-bold text-base">
                  {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                </div>
                <span className={`badge ${EMPLEADO_ESTADO_COLOR[emp.estado]}`}>
                  {EMPLEADO_ESTADO_LABEL[emp.estado]}
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{emp.nombre} {emp.apellido}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{emp.cargo}</p>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{emp.sector}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{calcularAntiguedad(emp.fechaIngreso)} de antigüedad</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400">{emp.jornada}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Empleado</th>
                <th className="table-header text-left hidden md:table-cell">Sector / Cargo</th>
                <th className="table-header text-left hidden lg:table-cell">Ingreso</th>
                <th className="table-header text-left hidden sm:table-cell">Contrato</th>
                <th className="table-header text-left">Estado</th>
                <th className="table-header text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{emp.nombre} {emp.apellido}</p>
                        <p className="text-xs text-slate-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <p className="text-slate-700 dark:text-slate-300">{emp.cargo}</p>
                    <p className="text-xs text-slate-400">{emp.sector}</p>
                  </td>
                  <td className="table-cell hidden lg:table-cell">
                    <p className="text-slate-700 dark:text-slate-300">{formatFecha(emp.fechaIngreso)}</p>
                    <p className="text-xs text-slate-400">{calcularAntiguedad(emp.fechaIngreso)}</p>
                  </td>
                  <td className="table-cell hidden sm:table-cell text-slate-600 dark:text-slate-400">{emp.tipoContrato}</td>
                  <td className="table-cell">
                    <span className={`badge ${EMPLEADO_ESTADO_COLOR[emp.estado]}`}>
                      {EMPLEADO_ESTADO_LABEL[emp.estado]}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <Link
                      href={`/dashboard/empleados/${emp.id}`}
                      className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                    >
                      Ver <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nuevo Empleado */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNuevo(false)}>
          <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Nuevo Empleado</p>
              <button onClick={() => setShowNuevo(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Nombre *</label><input className="form-input" placeholder="María" /></div>
                <div><label className="form-label">Apellido *</label><input className="form-input" placeholder="García" /></div>
              </div>
              <div><label className="form-label">DNI *</label><input className="form-input" placeholder="XX.XXX.XXX" /></div>
              <div><label className="form-label">Email institucional *</label><input className="form-input" type="email" placeholder="mgarcia@fno.org.ar" /></div>
              <div><label className="form-label">Teléfono</label><input className="form-input" placeholder="299-XXXXXXX" /></div>
              <div><label className="form-label">Fecha de nacimiento</label><input className="form-input" type="date" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Sector *</label>
                  <select className="form-select">
                    <option value="">Seleccionar</option>
                    {SECTORES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Cargo *</label><input className="form-input" placeholder="Docente" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Tipo de contrato</label>
                  <select className="form-select">
                    <option>Planta Permanente</option>
                    <option>Contrato</option>
                    <option>Planta Provisional</option>
                    <option>Pasantía</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Jornada</label>
                  <select className="form-select">
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Por Horas</option>
                  </select>
                </div>
              </div>
              <div><label className="form-label">Fecha de ingreso *</label><input className="form-input" type="date" /></div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowNuevo(false)} className="btn-secondary">Cancelar</button>
                <button className="btn-primary">Crear empleado</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
