'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, FileText, ClipboardList, Megaphone,
  BarChart3, User, HeadphonesIcon, ChevronLeft, ChevronRight,
  Building2, LogOut, Settings,
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, empleado, logout } = useAuth()

  const isAdmin = user?.role === 'admin'

  const adminLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/empleados', label: 'Empleados', icon: Users },
    { href: '/dashboard/recibos', label: 'Recibos de Sueldo', icon: FileText },
    { href: '/dashboard/solicitudes', label: 'Solicitudes', icon: ClipboardList },
    { href: '/dashboard/comunicaciones', label: 'Comunicaciones', icon: Megaphone },
    { href: '/dashboard/estadisticas', label: 'Estadísticas', icon: BarChart3 },
    { href: '/dashboard/portal-rrhh', label: 'Portal RRHH', icon: HeadphonesIcon },
    { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User },
  ]

  const employeeLinks = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/dashboard/recibos', label: 'Mis Recibos', icon: FileText },
    { href: '/dashboard/solicitudes', label: 'Mis Solicitudes', icon: ClipboardList },
    { href: '/dashboard/comunicaciones', label: 'Comunicaciones', icon: Megaphone },
    { href: '/dashboard/portal-rrhh', label: 'Portal RRHH', icon: HeadphonesIcon },
    { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User },
  ]

  const links = isAdmin ? adminLinks : employeeLinks

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen z-30 flex flex-col',
        'bg-brand-700 dark:bg-brand-900',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-white/10', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-white" />
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
        <div className="mx-3 mt-3 px-3 py-1.5 bg-white/10 rounded-lg">
          <p className="text-blue-100 text-xs font-medium">
            {isAdmin ? 'Administrador RRHH' : 'Portal del Empleado'}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'nav-link',
                collapsed ? 'justify-center px-2' : '',
                isActive ? 'nav-link-active' : 'nav-link-inactive',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 p-3 space-y-1">
        {!collapsed && empleado && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {empleado.nombre.charAt(0)}{empleado.apellido.charAt(0)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">{empleado.nombre} {empleado.apellido}</p>
              <p className="text-blue-200 text-xs truncate">{empleado.cargo}</p>
            </div>
          </div>
        )}
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
        className="absolute -right-3 top-20 w-6 h-6 bg-brand-700 dark:bg-brand-900 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-brand-600 transition-colors shadow-lg"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  )
}
