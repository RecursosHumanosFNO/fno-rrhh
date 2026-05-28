'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { useTheme } from '@/components/ThemeProvider'
import { Bell, Sun, Moon, Menu, Search, ChevronDown, X, CheckCheck, Users, Megaphone } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  onMenuToggle: () => void
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

  const isAdmin = user?.role === 'admin'
  const visibleNotifications = notifications.filter(n => isAdmin || n.tipo !== 'registro')
  const unread = visibleNotifications.filter(n => !n.leida)

  // Search results
  const searchResults = query.trim().length > 1 ? [
    ...(isAdmin ? empleados.filter(e =>
      `${e.nombre} ${e.apellido} ${e.cargo} ${e.email}`.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 4).map(e => ({
      type: 'empleado' as const,
      label: `${e.nombre} ${e.apellido}`,
      sub: e.cargo,
      href: `/dashboard/empleados/${e.id}`,
    })) : []),
    ...novedades.filter(n =>
      (n.titulo + ' ' + n.contenido).toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3).map(n => ({
      type: 'novedad' as const,
      label: n.titulo,
      sub: 'Novedad institucional',
      href: '/dashboard/comunicaciones',
    })),
  ] : []

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const tipoIcon: Record<string, string> = {
    solicitud: '📋', novedad: '📢', recibo: '💰', ticket: '🎫', registro: '👤', sistema: '🔔',
  }

  return (
    <header className="h-16 bg-[#e8f5fb]/95 backdrop-blur-sm dark:bg-slate-900 border-b border-sky-200/60 dark:border-slate-800 flex items-center px-4 gap-3 sticky top-0 z-20 shadow-sm">
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-sm hidden md:block relative">
        <div className="flex items-center gap-2 bg-[#d9eef7] dark:bg-slate-800 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-sky-400 dark:text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={isAdmin ? 'Buscar empleados, comunicaciones...' : 'Buscar comunicaciones...'}
            className="bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none w-full"
            value={query}
            autoComplete="new-password"
            onChange={e => { setQuery(e.target.value); setShowSearch(true) }}
            onFocus={() => setShowSearch(true)}
          />
          {query && (
            <button onClick={() => { setQuery(''); setShowSearch(false) }}>
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {showSearch && query.trim().length > 1 && (
          <div className="absolute top-full mt-1 left-0 right-0 card shadow-lg z-50 overflow-hidden animate-scale-in">
            {searchResults.length === 0 ? (
              <div className="px-4 py-3">
                <p className="text-sm text-slate-400 text-center">Sin resultados para "{query}"</p>
              </div>
            ) : searchResults.map((r, i) => (
              <Link
                key={i}
                href={r.href}
                onClick={() => { setQuery(''); setShowSearch(false) }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                  {r.type === 'empleado' ? <Users className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
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
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-teal-900/30 text-slate-500 dark:text-teal-400 transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowDropdown(false) }}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-teal-900/30 text-slate-500 dark:text-teal-400 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unread.length > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 border border-white dark:border-slate-900">
                {unread.length > 9 ? '9+' : unread.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 card shadow-lg z-50 overflow-hidden animate-scale-in">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {visibleNotifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Sin notificaciones</p>
                  </div>
                ) : visibleNotifications.slice(0, 10).map(n => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-3 hover:bg-slate-50 dark:hover:bg-teal-900/20 transition-colors cursor-pointer flex items-start gap-2.5 ${!n.leida ? 'bg-blue-50/60 dark:bg-teal-900/20' : ''}`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{tipoIcon[n.tipo] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${n.leida ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                        {n.texto}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.fecha}</p>
                    </div>
                    {!n.leida && <div className="w-2 h-2 bg-brand-600 dark:bg-teal-400 rounded-full shrink-0 mt-1.5" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative ml-1">
          <button
            onClick={() => { setShowDropdown(!showDropdown); setShowNotifs(false) }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {empleado?.foto
                ? <img src={empleado.foto} alt="" className="w-8 h-8 object-cover" />
                : empleado ? `${empleado.nombre.charAt(0)}${empleado.apellido.charAt(0)}` : 'U'
              }
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                {empleado ? `${empleado.nombre} ${empleado.apellido}` : 'Usuario'}
              </p>
              <p className="text-xs text-slate-400 leading-tight">{empleado?.cargo}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-12 w-48 card shadow-lg z-50 overflow-hidden animate-scale-in">
              <div className="p-1">
                <Link
                  href="/dashboard/perfil"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
