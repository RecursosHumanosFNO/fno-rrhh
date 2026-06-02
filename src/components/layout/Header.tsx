'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { useTheme } from '@/components/ThemeProvider'
import { Bell, Sun, Moon, Menu, Search, ChevronDown, X, CheckCheck, Users, Megaphone, CalendarDays, Cake } from 'lucide-react'
import Link from 'next/link'
import { eventos } from '@/lib/mockData'

interface HeaderProps {
  onMenuToggle: () => void
}

function fmtFecha(f: string) {
  if (!f) return ''
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}
function fmtDiaMes(f: string) {
  if (!f) return ''
  const [, m, d] = f.split('-')
  return `${d}/${m}`
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { empleado, user, logout } = useAuth()
  const { notifications, markNotificationRead, markAllRead, empleados, novedades } = useData()
  const { theme, toggleTheme } = useTheme()

  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notifsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin'

  // Admin: ve todo. Empleado: solo sus propias notificaciones + globales sin soloAdmin
  const visibleNotifications = [...notifications]
    .filter(n => {
      if (isAdmin) return !n.soloEmpleado            // admin ve todo menos lo exclusivo del empleado
      if (n.soloAdmin || n.tipo === 'registro') return false
      return !n.empleadoId || n.empleadoId === empleado?.id
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha)) // Más reciente primero

  const unread = visibleNotifications.filter(n => !n.leida)

  const q = query.trim().toLowerCase()

  // ── Resultados de búsqueda según rol ──────────────────────────────────────
  const searchResults = q.length > 1 ? [

    // Admin: busca empleados por nombre/cargo → perfil
    ...(isAdmin ? empleados.filter(e =>
      `${e.nombre} ${e.apellido} ${e.cargo} ${e.email}`.toLowerCase().includes(q)
    ).slice(0, 3).map(e => ({
      type: 'empleado' as const,
      label: `${e.nombre} ${e.apellido}`,
      sub: e.cargo,
      href: `/dashboard/empleados/${e.id}`,
    })) : []),

    // Todos: busca eventos institucionales (feriados, jornadas) por título
    ...eventos.filter(ev =>
      ev.titulo.toLowerCase().includes(q)
    ).slice(0, 4).map(ev => ({
      type: 'evento' as const,
      label: ev.titulo,
      sub: `📅 ${fmtFecha(ev.fecha)}${ev.descripcion ? ' · ' + ev.descripcion : ''}`,
      href: '/dashboard/eventos',
    })),

    // Todos: busca cumpleaños por nombre de compañero
    ...empleados.filter(e =>
      e.fechaNacimiento &&
      `${e.nombre} ${e.apellido}`.toLowerCase().includes(q)
    ).slice(0, 3).map(e => ({
      type: 'cumple' as const,
      label: `Cumpleaños de ${e.nombre} ${e.apellido}`,
      sub: `🎂 ${fmtDiaMes(e.fechaNacimiento)} · ${e.cargo}`,
      href: '/dashboard/eventos',
    })),

    // Admin: busca novedades/comunicaciones
    ...(isAdmin ? novedades.filter(n =>
      (n.titulo + ' ' + n.contenido).toLowerCase().includes(q)
    ).slice(0, 2).map(n => ({
      type: 'novedad' as const,
      label: n.titulo,
      sub: 'Comunicación institucional',
      href: '/dashboard/comunicaciones',
    })) : []),

  ] : []

  // Cierra cualquier panel al hacer click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        setQuery('')
      }
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const tipoIcon: Record<string, string> = {
    solicitud: '📋', novedad: '📢', recibo: '💰', ticket: '🎫', registro: '👤', sistema: '🔔',
  }

  // A dónde lleva cada notificación al hacer clic (según rol y tipo)
  function notifHref(tipo: string): string {
    switch (tipo) {
      case 'solicitud': return '/dashboard/solicitudes'
      case 'novedad':   return '/dashboard/comunicaciones'
      case 'recibo':    return '/dashboard/recibos'
      case 'ticket':    return '/dashboard/portal-rrhh'
      case 'registro':  return isAdmin ? '/dashboard/registros-pendientes' : '/dashboard'
      default:          return '/dashboard'
    }
  }

  function ResultIcon({ type }: { type: string }) {
    if (type === 'empleado') return <Users className="w-4 h-4" />
    if (type === 'evento')   return <CalendarDays className="w-4 h-4" />
    if (type === 'cumple')   return <Cake className="w-4 h-4" />
    return <Megaphone className="w-4 h-4" />
  }

  return (
    <header className="h-16 bg-[#c0e5e1]/90 backdrop-blur-sm dark:bg-slate-900 border-b border-[#9dd4ce]/50 dark:border-slate-800 flex items-center px-4 gap-3 sticky top-0 z-20 shadow-sm">
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/30 dark:hover:bg-slate-800 text-teal-800 dark:text-slate-400"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-sm hidden md:block relative">
        <div className="flex items-center gap-2 bg-white/40 dark:bg-slate-800 border border-white/60 dark:border-transparent rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-teal-700/70 dark:text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={isAdmin ? 'Buscar empleados, eventos...' : 'Buscar eventos, cumpleaños...'}
            className="bg-transparent text-sm text-teal-900 dark:text-slate-300 placeholder-teal-700/50 dark:placeholder-slate-500 focus:outline-none w-full"
            value={query}
            autoComplete="new-password"
            onChange={e => { setQuery(e.target.value); setShowSearch(true) }}
            onFocus={() => setShowSearch(true)}
          />
          {query && (
            <button onClick={() => { setQuery(''); setShowSearch(false) }}>
              <X className="w-3.5 h-3.5 text-teal-600/60" />
            </button>
          )}
        </div>

        {showSearch && q.length > 1 && (
          <div className="absolute top-full mt-1 left-0 right-0 card !bg-white dark:!bg-slate-900 shadow-xl z-50 overflow-hidden animate-scale-in">
            {searchResults.length === 0 ? (
              <div className="px-4 py-3">
                <p className="text-sm text-slate-400 text-center">Sin resultados para "{query}"</p>
              </div>
            ) : searchResults.map((r, i) => (
              <Link
                key={i}
                href={r.href}
                onClick={() => { setQuery(''); setShowSearch(false) }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#e2f2f9] dark:hover:bg-slate-800 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  r.type === 'empleado' ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' :
                  r.type === 'evento'   ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' :
                  r.type === 'cumple'   ? 'bg-pink-50 text-pink-500 dark:bg-pink-900/30 dark:text-pink-400' :
                                          'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  <ResultIcon type={r.type} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{r.label}</p>
                  <p className="text-xs text-slate-400 truncate">{r.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/30 dark:hover:bg-teal-900/30 text-teal-800 dark:text-teal-400 transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifsRef}>
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowDropdown(false) }}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/30 dark:hover:bg-teal-900/30 text-teal-800 dark:text-teal-400 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unread.length > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 border border-white dark:border-slate-900">
                {unread.length > 9 ? '9+' : unread.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 card !bg-white dark:!bg-slate-900 shadow-xl z-50 overflow-hidden animate-scale-in">
              <div className="p-3 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  Notificaciones
                  {unread.length > 0 && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full px-1.5 py-0.5">
                      {unread.length}
                    </span>
                  )}
                </p>
                {unread.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-brand-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> Leer todo
                  </button>
                )}
              </div>
              <div className="divide-y divide-sky-100/80 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {visibleNotifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Sin notificaciones</p>
                  </div>
                ) : visibleNotifications.slice(0, 10).map(n => (
                  <Link
                    key={n.id}
                    href={notifHref(n.tipo)}
                    onClick={() => { markNotificationRead(n.id); setShowNotifs(false) }}
                    className={`p-3 hover:bg-[#e5f4fa] dark:hover:bg-teal-900/20 transition-colors cursor-pointer flex items-start gap-2.5 ${!n.leida ? 'bg-sky-50/80 dark:bg-teal-900/20' : ''}`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{tipoIcon[n.tipo] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${n.leida ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                        {n.texto}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.fecha}</p>
                    </div>
                    {!n.leida && <div className="w-2 h-2 bg-brand-600 dark:bg-teal-400 rounded-full shrink-0 mt-1.5" />}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => { setShowDropdown(!showDropdown); setShowNotifs(false) }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-white/30 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {empleado?.foto
                ? <img src={empleado.foto} alt="" className="w-8 h-8 object-cover" />
                : empleado ? `${empleado.nombre.charAt(0)}${empleado.apellido.charAt(0)}` : 'U'
              }
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-teal-900 dark:text-slate-200 leading-tight">
                {empleado ? `${empleado.nombre} ${empleado.apellido}` : 'Usuario'}
              </p>
              <p className="text-xs text-teal-700/70 dark:text-slate-400 leading-tight">{empleado?.cargo}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-teal-700/60 dark:text-slate-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-12 w-48 card !bg-white dark:!bg-slate-900 shadow-xl z-50 overflow-hidden animate-scale-in">
              <div className="p-1">
                <Link
                  href="/dashboard/perfil"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-[#e2f2f9] dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Mi Perfil
                </Link>
                <button
                  onClick={logout}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
