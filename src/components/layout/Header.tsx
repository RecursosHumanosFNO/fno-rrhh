'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/components/ThemeProvider'
import { Bell, Sun, Moon, Menu, Search, ChevronDown } from 'lucide-react'
import { novedades } from '@/lib/mockData'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { empleado, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)

  const alertas = novedades.filter(n => n.importante).slice(0, 3)

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3 sticky top-0 z-20 shadow-sm">
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar empleados, solicitudes..."
          className="bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none w-full"
        />
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowDropdown(false) }}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative transition-colors"
          >
            <Bell className="w-4.5 h-4.5" />
            {alertas.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 card shadow-lg z-50 overflow-hidden animate-scale-in">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Notificaciones</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {alertas.map(a => (
                  <div key={a.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-1">{a.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{a.contenido}</p>
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
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold">
              {empleado ? `${empleado.nombre.charAt(0)}${empleado.apellido.charAt(0)}` : 'U'}
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
                <a href="/dashboard/perfil" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  Mi Perfil
                </a>
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
