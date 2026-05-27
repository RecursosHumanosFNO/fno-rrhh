'use client'

import { useData } from '@/contexts/DataContext'
import { eventos } from '@/lib/mockData'
import { parseLocalDate, formatFecha } from '@/lib/utils'
import { Calendar, PartyPopper, Zap, AlertTriangle } from 'lucide-react'

export default function EventosPage() {
  const { empleados } = useData()

  const hoy = new Date()

  const cumpleaniosMes = empleados.filter(e => {
    if (!e.fechaNacimiento) return false
    const nac = parseLocalDate(e.fechaNacimiento)
    return nac.getMonth() === hoy.getMonth()
  }).sort((a, b) => {
    const da = parseLocalDate(a.fechaNacimiento).getDate()
    const db = parseLocalDate(b.fechaNacimiento).getDate()
    return da - db
  })

  const eventosFuturos = eventos
    .filter(e => {
      const fecha = parseLocalDate(e.fecha)
      return fecha >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const eventosOrdenados = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <div className="page-container">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Eventos y Cumpleaños</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Calendario institucional y cumpleaños del equipo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Próximos eventos highlight */}
          {eventosFuturos.length > 0 && (
            <div className="card p-5">
              <p className="section-title mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Próximos eventos
              </p>
              <div className="space-y-3">
                {eventosFuturos.slice(0, 4).map(ev => {
                  const fecha = parseLocalDate(ev.fecha)
                  return (
                    <div key={ev.id} className="flex items-center gap-4">
                      <div className="text-center shrink-0 w-12">
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{fecha.getDate()}</p>
                        <p className="text-xs text-slate-500 uppercase">
                          {fecha.toLocaleDateString('es-AR', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ev.titulo}</p>
                        {ev.descripcion && <p className="text-xs text-slate-400 mt-0.5">{ev.descripcion}</p>}
                      </div>
                      <span className={`badge text-xs shrink-0 ${
                        ev.tipo === 'feriado'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {ev.tipo === 'feriado' ? '🇦🇷 Feriado' : '🏫 Jornada'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Calendario completo */}
          <div className="card p-5">
            <p className="section-title mb-5 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Calendario 2026 — Feriados y Jornadas Institucionales
            </p>
            <div className="space-y-3">
              {eventosOrdenados.map(ev => {
                const fecha = parseLocalDate(ev.fecha)
                const pasado = fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
                return (
                  <div key={ev.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-opacity ${
                    pasado ? 'opacity-45' : ''
                  } ${
                    ev.tipo === 'feriado'
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10'
                  }`}>
                    <div className="text-center shrink-0 w-12">
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{fecha.getDate()}</p>
                      <p className="text-xs text-slate-500 uppercase">
                        {fecha.toLocaleDateString('es-AR', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{ev.titulo}</p>
                      {ev.descripcion && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{ev.descripcion}</p>}
                    </div>
                    <span className={`badge text-xs shrink-0 ${
                      ev.tipo === 'feriado'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {ev.tipo === 'feriado' ? '🇦🇷 Feriado' : '🏫 Jornada'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Cumpleaños del mes */}
        <div className="card p-5 h-fit">
          <p className="section-title text-base mb-4 flex items-center gap-2">
            <PartyPopper className="w-4 h-4 text-pink-500" /> Cumpleaños del mes
          </p>
          <div className="space-y-3">
            {cumpleaniosMes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Sin cumpleaños este mes</p>
            ) : cumpleaniosMes.map(e => {
              const nac = parseLocalDate(e.fechaNacimiento)
              const esHoy = nac.getDate() === hoy.getDate()
              return (
                <div key={e.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${esHoy ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-xs font-bold overflow-hidden shrink-0">
                    {e.foto ? <img src={e.foto} alt="" className="w-9 h-9 object-cover" /> : `${e.nombre.charAt(0)}${e.apellido.charAt(0)}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{e.nombre} {e.apellido}</p>
                    <p className="text-xs text-slate-400">{nac.getDate()}/{hoy.getMonth() + 1}</p>
                  </div>
                  {esHoy && <span className="text-base">🎂</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
