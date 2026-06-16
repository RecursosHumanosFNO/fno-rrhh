'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, FileText, ClipboardList, Megaphone,
  BarChart3, User, HeadphonesIcon, ChevronLeft, ChevronRight,
  LogOut, ExternalLink, Info, UserCheck, CalendarDays, AlertTriangle,
  BookOpen, ClipboardCheck,
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavLink {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  warn?: boolean
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, empleado, logout } = useAuth()
  const { pendingRegistrations, solicitudes } = useData()

  const isAdmin = user?.role === 'admin'
  const isComunicaciones = user?.role === 'comunicaciones'

  // Perfil incompleto del usuario logueado (mismos campos que el detalle de empleado)
  const perfilIncompleto = !!empleado && [
    empleado.fechaNacimiento, empleado.cuil, empleado.telefono, empleado.direccion,
    empleado.cbu, empleado.banco, empleado.contactoEmergencia?.nombre,
    empleado.contactoEmergencia?.telefono, empleado.contactoEmergencia?.relacion, empleado.foto,
  ].some(v => !v)

  const adminLinks: NavLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/registros-pendientes', label: 'Accesos Pendientes', icon: UserCheck, badge: pendingRegistrations.length },
    { href: '/dashboard/empleados', label: 'Empleados', icon: Users },
    { href: '/dashboard/recibos', label: 'Recibos de Sueldo', icon: FileText },
    { href: '/dashboard/solicitudes', label: 'Solicitudes y Pedidos', icon: ClipboardList, badge: solicitudes.filter(s => s.estado === 'pendiente').length },
    { href: '/dashboard/comunicaciones', label: 'Comunicaciones', icon: Megaphone },
    { href: '/dashboard/eventos', label: 'Calendario', icon: CalendarDays },
    { href: '/dashboard/novedades-internas', label: 'Novedades Internas', icon: ClipboardCheck },
    { href: '/dashboard/estadisticas', label: 'Estadísticas', icon: BarChart3 },
    { href: '/dashboard/fundacion', label: 'La Fundación', icon: Info },
    { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User, warn: perfilIncompleto },
    { href: '/dashboard/instructivo', label: 'Instructivo', icon: BookOpen },
  ]

  const employeeLinks: NavLink[] = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/dashboard/recibos', label: 'Mis Recibos', icon: FileText },
    { href: '/dashboard/solicitudes', label: 'Solicitudes y Pedidos', icon: ClipboardList },
    { href: '/dashboard/comunicaciones', label: 'Comunicaciones', icon: Megaphone },
    { href: '/dashboard/eventos', label: 'Calendario', icon: CalendarDays },
    { href: '/dashboard/fundacion', label: 'La Fundación', icon: Info },
    { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User, warn: perfilIncompleto },
    { href: '/dashboard/instructivo', label: 'Instructivo', icon: BookOpen },
  ]

  const comunicacionesLinks: NavLink[] = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/dashboard/comunicaciones', label: 'Comunicaciones', icon: Megaphone },
    { href: '/dashboard/eventos', label: 'Calendario', icon: CalendarDays },
    { href: '/dashboard/recibos', label: 'Mis Recibos', icon: FileText },
    { href: '/dashboard/solicitudes', label: 'Solicitudes y Pedidos', icon: ClipboardList },
    { href: '/dashboard/fundacion', label: 'La Fundación', icon: Info },
    { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User, warn: perfilIncompleto },
    { href: '/dashboard/instructivo', label: 'Instructivo', icon: BookOpen },
  ]

  const links = isAdmin ? adminLinks : isComunicaciones ? comunicacionesLinks : employeeLinks

  return (
    <aside className={cn(
      'fixed top-0 left-0 h-screen z-30 flex flex-col bg-brand-700 dark:bg-brand-900 transition-all duration-300 ease-in-out',
      collapsed ? 'w-[72px]' : 'w-[240px]',
    )}>
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-3 border-b border-white/10', collapsed ? 'justify-center' : 'gap-3')}>
        {/* Logo circular */}
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 bg-white shrink-0 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Logo FNO"
            width={40}
            height={40}
            className="object-contain"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#23597e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`
              }
            }}
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight truncate">Fundación</p>
            <p className="text-blue-200 text-xs truncate">Neuquén Oeste</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-1.5 bg-white/10 dark:bg-teal-900/30 rounded-lg border border-transparent dark:border-teal-700/30">
          <p className="text-blue-100 dark:text-teal-300 text-xs font-medium">
            {isAdmin ? '🔑 Administrador RRHH' : isComunicaciones ? '📢 Comunicaciones' : '👤 Portal del Empleado'}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {links.map(({ href, label, icon: Icon, badge, warn }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? (warn ? `${label} · perfil incompleto` : label) : undefined}
              className={cn('nav-link relative', collapsed ? 'justify-center px-2' : '', isActive ? 'nav-link-active' : 'nav-link-inactive')}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate flex-1">{label}</span>}
              {warn && (
                <AlertTriangle className={cn(
                  'text-amber-400 fill-amber-400/20 shrink-0',
                  collapsed ? 'absolute top-1 right-1 w-3.5 h-3.5' : 'w-4 h-4',
                )} />
              )}
              {badge !== undefined && badge > 0 && (
                <span className={cn(
                  'bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center',
                  collapsed ? 'absolute top-1 right-1 w-4 h-4 text-[10px]' : 'w-5 h-5 shrink-0',
                )}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 space-y-1">
        {/* User info */}
        {!collapsed && empleado && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {empleado.foto ? (
                <img src={empleado.foto} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                `${empleado.nombre.charAt(0)}${empleado.apellido.charAt(0)}`
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">{empleado.nombre} {empleado.apellido}</p>
              <p className="text-blue-200 text-xs truncate">{empleado.cargo}</p>
            </div>
          </div>
        )}

        {/* Website link */}
        <a
          href="https://fundacionnqnoeste.com/"
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? 'Sitio web' : undefined}
          className={cn('nav-link nav-link-inactive', collapsed ? 'justify-center px-2' : '')}
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-xs">Sitio web de la Fundación</span>}
        </a>

        {/* Logout */}
        <button
          onClick={logout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn('nav-link nav-link-inactive w-full', collapsed ? 'justify-center px-2' : '')}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        className="absolute -right-3 top-20 w-6 h-6 bg-brand-700 dark:bg-brand-900 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-brand-600 transition-colors shadow-lg"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  )
}
