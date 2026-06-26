'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { useRouter } from 'next/navigation'
import { SECTORES } from '@/lib/mockData'
import {
  EMPLEADO_ESTADO_COLOR, EMPLEADO_ESTADO_LABEL, formatFecha, calcularAntiguedad, calcularEdad, uid,
} from '@/lib/utils'
import {
  Search, Users, Plus, Download, LayoutGrid, List,
  Mail, Building2, Calendar, ChevronRight, X, CheckCircle2, XCircle,
  SlidersHorizontal, ArrowUpDown, History,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { EmpleadoEstado, Empleado, DesvinculacionMotivo } from '@/types'
import * as XLSX from 'xlsx'

// ── Excel export ──────────────────────────────────────────────────────────────
function exportarExcel(empleados: Empleado[]) {
  const ESTADO: Record<string, string> = {
    activo: 'Activo', inactivo: 'Inactivo',
    licencia: 'En Licencia', vacaciones: 'De Vacaciones',
  }

  const headers = [
    'Apellido', 'Nombre', 'DNI', 'CUIL', 'Email', 'Teléfono',
    'Fecha Nacimiento', 'Edad',
    'Sector', 'Cargo', 'Tipo Contrato', 'Jornada',
    'Fecha Ingreso', 'Antigüedad', 'Estado', 'Supervisor',
    'Dirección', 'CBU', 'Banco',
    'Emergencia — Nombre', 'Emergencia — Teléfono', 'Emergencia — Relación',
  ]

  const rows = [...empleados]
    .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'))
    .map(e => [
      e.apellido,
      e.nombre,
      e.dni || '',
      e.cuil || '',
      e.email,
      e.telefono || '',
      e.fechaNacimiento ? formatFecha(e.fechaNacimiento) : '',
      e.fechaNacimiento ? `${calcularEdad(e.fechaNacimiento)} años` : '',
      e.sector,
      e.cargo,
      e.tipoContrato,
      e.jornada,
      formatFecha(e.fechaIngreso),
      calcularAntiguedad(e.fechaIngreso),
      ESTADO[e.estado] ?? e.estado,
      e.supervisor || '',
      e.direccion || '',
      e.cbu || '',
      e.banco || '',
      e.contactoEmergencia?.nombre || '',
      e.contactoEmergencia?.telefono || '',
      e.contactoEmergencia?.relacion || '',
    ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Anchos de columna (en caracteres)
  ws['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 32 }, { wch: 16 },
    { wch: 16 }, { wch: 8  },
    { wch: 22 }, { wch: 28 }, { wch: 20 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 13 }, { wch: 20 },
    { wch: 28 }, { wch: 24 }, { wch: 16 },
    { wch: 24 }, { wch: 18 }, { wch: 20 },
  ]

  // Fila de encabezado congelada (no se mueve al hacer scroll)
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Empleados FNO')

  const hoy = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `empleados_fno_${hoy}.xlsx`)
}

function EmpleadoCard({ emp, foto }: { emp: Empleado; foto?: string }) {
  const fotoSrc = foto || emp.foto
  return (
    <Link href={`/dashboard/empleados/${emp.id}`} className="card-hover p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-brand-700 flex items-center justify-center text-white font-bold text-base overflow-hidden">
          {fotoSrc
            ? <img src={fotoSrc} alt="" className="w-12 h-12 object-cover" />
            : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`
          }
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
  )
}

export default function EmpleadosPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  if (user?.role !== 'admin') return null

  return <EmpleadosContent />
}

function EmpleadosContent() {
  const {
    empleados: allEmpleados, pendingRegistrations,
    addEmpleado, deleteEmpleado,
    approvePendingRegistration, rejectPendingRegistration,
  } = useData()

  // Mapa id → foto: cargado una vez al montar (el sync masivo no incluye fotos)
  const [fotoMap, setFotoMap] = useState<Record<string, string>>({})
  const fotosFetched = useRef(false)
  useEffect(() => {
    if (fotosFetched.current || !supabase) return
    fotosFetched.current = true
    supabase.from('fno_empleados').select('id, foto').then(({ data }) => {
      if (!data) return
      const map: Record<string, string> = {}
      for (const row of data) if (row.foto) map[row.id as string] = row.foto as string
      setFotoMap(map)
    })
  }, [])

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [query, setQuery] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [cargoFilter, setCargoFilter] = useState('')
  const [ingresoDesde, setIngresoDesde] = useState('')
  const [ingresoHasta, setIngresoHasta] = useState('')
  const [sortBy, setSortBy] = useState<'apellido' | 'reciente' | 'antiguo'>('apellido')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showNuevo, setShowNuevo] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [mainTab, setMainTab] = useState<'activos' | 'historial'>('activos')

  const DESVINCULACION_MOTIVO_LABEL: Record<DesvinculacionMotivo, string> = {
    renuncia_voluntaria: 'Renuncia voluntaria', despido_sin_causa: 'Despido sin causa',
    despido_con_causa: 'Despido con causa', jubilacion: 'Jubilación',
    vencimiento_contrato: 'Vto. de contrato', acuerdo_mutuo: 'Acuerdo mutuo',
    fallecimiento: 'Fallecimiento', otro: 'Otro',
  }

  const inactivos = useMemo(
    () => allEmpleados.filter(e => e.estado === 'inactivo').sort((a, b) => {
      const fa = a.desvinculacion?.fecha ?? ''
      const fb = b.desvinculacion?.fecha ?? ''
      return fb.localeCompare(fa)
    }),
    [allEmpleados],
  )

  // Cargos únicos para el filtro (ordenados alfabéticamente)
  const cargosUnicos = useMemo(
    () => Array.from(new Set(allEmpleados.map(e => e.cargo).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [allEmpleados],
  )

  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', email: '', telefono: '',
    fechaNacimiento: '', sector: '', cargo: '', tipoContrato: 'Contrato' as const,
    jornada: 'Full Time' as const, fechaIngreso: new Date().toISOString().slice(0, 10),
    supervisor: '', password: 'cambiar123',
  })

  const filtered = useMemo(() => {
    const list = allEmpleados.filter(e => {
      if (e.estado === 'inactivo') return false  // Inactivos van al tab Historial
      const matchQuery = `${e.nombre} ${e.apellido} ${e.cargo} ${e.email} ${e.dni}`.toLowerCase().includes(query.toLowerCase())
      const matchSector = !sectorFilter || e.sector === sectorFilter
      const matchEstado = !estadoFilter || e.estado === estadoFilter
      const matchCargo = !cargoFilter || e.cargo === cargoFilter
      const matchDesde = !ingresoDesde || (e.fechaIngreso && e.fechaIngreso >= ingresoDesde)
      const matchHasta = !ingresoHasta || (e.fechaIngreso && e.fechaIngreso <= ingresoHasta)
      return matchQuery && matchSector && matchEstado && matchCargo && matchDesde && matchHasta
    })
    list.sort((a, b) => {
      if (sortBy === 'apellido') return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es')
      // reciente: ingreso descendente | antiguo: ingreso ascendente
      const fa = a.fechaIngreso || ''
      const fb = b.fechaIngreso || ''
      return sortBy === 'reciente' ? fb.localeCompare(fa) : fa.localeCompare(fb)
    })
    return list
  }, [allEmpleados, query, sectorFilter, estadoFilter, cargoFilter, ingresoDesde, ingresoHasta, sortBy])

  const hasFilters = !!query || !!sectorFilter || !!estadoFilter || !!cargoFilter || !!ingresoDesde || !!ingresoHasta
  const hasAdvanced = !!cargoFilter || !!ingresoDesde || !!ingresoHasta || sortBy !== 'apellido'

  function limpiarFiltros() {
    setQuery(''); setSectorFilter(''); setEstadoFilter('')
    setCargoFilter(''); setIngresoDesde(''); setIngresoHasta(''); setSortBy('apellido')
  }

  async function handleCreate() {
    if (!form.nombre || !form.apellido || !form.email || !form.sector || !form.cargo) return
    if (form.password.length < 6) { setCreateError('La contraseña inicial debe tener al menos 6 caracteres.'); return }

    setCreateError('')
    setCreating(true)
    const emailNorm = form.email.toLowerCase().trim()

    try {
      const empId = addEmpleado({
        nombre: form.nombre, apellido: form.apellido, dni: form.dni,
        fechaNacimiento: form.fechaNacimiento, email: emailNorm,
        telefono: form.telefono, direccion: '', foto: '', fotoCover: '', cuil: '',
        contactoEmergencia: { nombre: '', telefono: '', relacion: '' },
        sector: form.sector, cargo: form.cargo, cargosExtra: [],
        fechaIngreso: form.fechaIngreso,
        tipoContrato: form.tipoContrato,
        jornada: form.jornada,
        supervisor: form.supervisor,
        estado: 'activo' as EmpleadoEstado,
        diasVacaciones: 14, diasVacacionesUsados: 0,
      })

      // Crear cuenta de login en Supabase Auth (contraseña encriptada) + fno_users
      const res = await fetch('/api/admin/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailNorm,
          password: form.password,
          userId: uid(),
          empleadoId: empId,
          role: 'employee',
        }),
      })
      const data = await res.json()

      if (!data.ok) {
        // El empleado quedó creado pero la cuenta de login falló: avisar
        setCreating(false)
        setCreateError(
          data.error?.includes('already')
            ? 'Ya existe una cuenta de login con ese email. El empleado se creó, pero revisá el email.'
            : `El empleado se creó, pero no se pudo crear su cuenta de login: ${data.error ?? 'error desconocido'}`,
        )
        return
      }

      setCreating(false)
      setShowNuevo(false)
      setForm({
        nombre: '', apellido: '', dni: '', email: '', telefono: '',
        fechaNacimiento: '', sector: '', cargo: '', tipoContrato: 'Contrato',
        jornada: 'Full Time', fechaIngreso: new Date().toISOString().slice(0, 10),
        supervisor: '', password: 'cambiar123',
      })
    } catch {
      setCreating(false)
      setCreateError('Error de conexión al crear la cuenta. Intentá de nuevo.')
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Empleados</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {allEmpleados.filter(e => e.estado !== 'inactivo').length} activos · {inactivos.length} en historial
            {pendingRegistrations.length > 0 && (
              <button onClick={() => setShowPending(true)} className="ml-2 inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium">
                · {pendingRegistrations.length} pendiente{pendingRegistrations.length > 1 ? 's' : ''} de aprobación ↗
              </button>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportarExcel(filtered)}
            className="btn-secondary"
            title={hasFilters ? `Exportar ${filtered.length} empleados (filtrados)` : `Exportar todos (${allEmpleados.length})`}
          >
            <Download className="w-4 h-4" />
            Exportar{hasFilters ? ` (${filtered.length})` : ''}
          </button>
          <button onClick={() => setShowNuevo(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo empleado
          </button>
        </div>
      </div>

      {/* Tabs: Activos / Historial */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {([
          { key: 'activos', label: 'Empleados activos', icon: Users },
          { key: 'historial', label: `Historial de bajas${inactivos.length > 0 ? ` (${inactivos.length})` : ''}`, icon: History },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mainTab === key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Pending registrations quick panel */}
      {showPending && pendingRegistrations.length > 0 && (
        <div className="card p-5 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title text-amber-700 dark:text-amber-400">Solicitudes de acceso pendientes</p>
            <button onClick={() => setShowPending(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="space-y-3">
            {pendingRegistrations.map(reg => (
              <div key={reg.id} className="flex items-center gap-3 p-3 bg-[#e8f5fb] dark:bg-slate-800/50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 text-xs font-bold shrink-0">
                  {reg.nombre.charAt(0)}{reg.apellido.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{reg.nombre} {reg.apellido}</p>
                  <p className="text-xs text-slate-400">{reg.cargo} · {reg.sector} · {reg.email}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => approvePendingRegistration(reg.id)}
                    className="btn-success text-sm py-1.5 px-3"
                    title="Aprobar acceso"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Aprobar
                  </button>
                  <button
                    onClick={() => rejectPendingRegistration(reg.id)}
                    className="btn-danger text-sm py-1.5 px-3"
                    title="Rechazar"
                  >
                    <XCircle className="w-4 h-4" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ HISTORIAL DE BAJAS ══ */}
      {mainTab === 'historial' && (
        <div className="space-y-3">
          {inactivos.length === 0 ? (
            <div className="card p-12 text-center">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Sin empleados desvinculados</p>
              <p className="text-slate-400 text-sm mt-1">Cuando desactivés a un empleado, aparecerá aquí con sus datos de baja.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60">
                    <th className="table-header text-left">Empleado</th>
                    <th className="table-header text-left hidden sm:table-cell">Motivo de baja</th>
                    <th className="table-header text-left hidden md:table-cell">Fecha efectiva</th>
                    <th className="table-header text-left hidden lg:table-cell">Telegrama</th>
                    <th className="table-header text-left hidden lg:table-cell">Liquidación</th>
                    <th className="table-header text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {inactivos.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="table-cell max-w-[180px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold shrink-0 overflow-hidden">
                            {emp.foto ? <img src={emp.foto} alt="" className="w-9 h-9 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{emp.apellido}, {emp.nombre}</p>
                            <p className="text-xs text-slate-400 truncate">{emp.cargo} · {emp.sector}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell hidden sm:table-cell text-slate-600 dark:text-slate-400">
                        {emp.desvinculacion
                          ? <>{DESVINCULACION_MOTIVO_LABEL[emp.desvinculacion.motivo]}{emp.desvinculacion.motivoDetalle ? ` — ${emp.desvinculacion.motivoDetalle}` : ''}</>
                          : <span className="text-slate-400 italic">Sin datos</span>
                        }
                      </td>
                      <td className="table-cell hidden md:table-cell text-slate-600 dark:text-slate-400">
                        {emp.desvinculacion?.fecha ? formatFecha(emp.desvinculacion.fecha) : '—'}
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        {emp.desvinculacion
                          ? <span className={emp.desvinculacion.telegramaEntregado ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>
                              {emp.desvinculacion.telegramaEntregado ? '✅ Entregado' : '⚠ Pendiente'}
                            </span>
                          : '—'}
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        {emp.desvinculacion
                          ? <span className={emp.desvinculacion.liquidacionFinal === 'entregada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>
                              {emp.desvinculacion.liquidacionFinal === 'entregada' ? '✅ Entregada' : '⏳ Pendiente'}
                            </span>
                          : '—'}
                      </td>
                      <td className="table-cell text-right">
                        <Link href={`/dashboard/empleados/${emp.id}`} className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium">
                          Ver <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ EMPLEADOS ACTIVOS ══ */}
      {mainTab === 'activos' && (<>
      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#d9eef7] dark:bg-slate-800 rounded-lg px-3 py-2 flex-1 min-w-48">
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
        <select className="form-select w-auto text-sm" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
          <option value="">Todos los sectores</option>
          {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select w-auto text-sm" value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="licencia">En Licencia</option>
        </select>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
            showAdvanced || hasAdvanced
              ? 'border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros avanzados
          {hasAdvanced && <span className="w-2 h-2 rounded-full bg-brand-500" />}
        </button>
        {hasFilters && (
          <button
            onClick={limpiarFiltros}
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

        {/* Fila de filtros avanzados */}
        {showAdvanced && (
          <div className="w-full flex flex-wrap gap-3 items-end pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Cargo</label>
              <select className="form-select w-auto text-sm" value={cargoFilter} onChange={e => setCargoFilter(e.target.value)}>
                <option value="">Todos los cargos</option>
                {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Ingreso desde</label>
              <input type="date" className="form-input w-auto text-sm" value={ingresoDesde} onChange={e => setIngresoDesde(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Ingreso hasta</label>
              <input type="date" className="form-input w-auto text-sm" value={ingresoHasta} onChange={e => setIngresoHasta(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Ordenar por
              </label>
              <select className="form-select w-auto text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                <option value="apellido">Apellido (A-Z)</option>
                <option value="reciente">Ingreso más reciente</option>
                <option value="antiguo">Mayor antigüedad</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron empleados</p>
          <p className="text-slate-400 text-sm mt-1">Probá con otros filtros de búsqueda</p>
        </div>
      ) : view === 'grid' ? (
        // Agrupar por sector cuando no hay filtro activo
        (() => {
          const agrupar = !sectorFilter && !query && !estadoFilter && !cargoFilter && sortBy === 'apellido'
          if (!agrupar) {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(emp => <EmpleadoCard key={emp.id} emp={emp} foto={fotoMap[emp.id]} />)}
              </div>
            )
          }
          const grupos = filtered.reduce<Record<string, typeof filtered>>((acc, emp) => {
            const s = emp.sector || 'Sin sector'
            if (!acc[s]) acc[s] = []
            acc[s].push(emp)
            return acc
          }, {})
          const sectoresOrdenados = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es'))
          return (
            <div className="space-y-8">
              {sectoresOrdenados.map(sector => (
                <div key={sector}>
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-4 h-4 text-brand-500 shrink-0" />
                    <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-400 uppercase tracking-wide">{sector}</h3>
                    <span className="text-xs text-slate-400 font-normal">({grupos[sector].length})</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {grupos[sector].map(emp => <EmpleadoCard key={emp.id} emp={emp} foto={fotoMap[emp.id]} />)}
                  </div>
                </div>
              ))}
            </div>
          )
        })()
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[500px]">
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
                <tr key={emp.id} className="hover:bg-[#e2f2f9] dark:hover:bg-slate-800/50 transition-colors">
                  <td className="table-cell max-w-[180px]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                        {emp.foto ? <img src={emp.foto} alt="" className="w-9 h-9 object-cover" /> : `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{emp.apellido}, {emp.nombre}</p>
                        <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <p className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{emp.cargo}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[140px]">{emp.sector}</p>
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
      </>)}

      {/* Modal Nuevo Empleado */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!creating) { setShowNuevo(false); setCreateError('') } }}>
          <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="section-title">Nuevo Empleado</p>
              <button onClick={() => { setShowNuevo(false); setCreateError('') }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {createError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-2.5 text-sm">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" placeholder="María" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Apellido *</label>
                  <input className="form-input" placeholder="García" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">DNI</label>
                  <input className="form-input" placeholder="XX.XXX.XXX" value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" placeholder="299-XXXXXXX" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" placeholder="empleado@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Fecha de nacimiento</label>
                <input className="form-input" type="date" value={form.fechaNacimiento} onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Sector *</label>
                  <select className="form-select" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    {SECTORES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Cargo *</label>
                  <input className="form-input" placeholder="Docente" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Tipo de contrato</label>
                  <select className="form-select" value={form.tipoContrato} onChange={e => setForm(f => ({ ...f, tipoContrato: e.target.value as typeof form.tipoContrato }))}>
                    <option>Contrato</option>
                    <option>Período de prueba</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Jornada</label>
                  <select className="form-select" value={form.jornada} onChange={e => setForm(f => ({ ...f, jornada: e.target.value as typeof form.jornada }))}>
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>6 horas diarias</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Fecha de ingreso *</label>
                <input className="form-input" type="date" value={form.fechaIngreso} onChange={e => setForm(f => ({ ...f, fechaIngreso: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Contraseña inicial</label>
                <input className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="cambiar123" />
                <p className="text-xs text-slate-400 mt-1">El empleado podrá cambiarla con el link de recuperación o desde su perfil.</p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => { setShowNuevo(false); setCreateError('') }} disabled={creating} className="btn-secondary disabled:opacity-50">Cancelar</button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !form.nombre || !form.apellido || !form.email || !form.sector || !form.cargo}
                  className="btn-primary disabled:opacity-50"
                >
                  {creating
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
                    : 'Crear empleado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
