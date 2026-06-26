'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import AIChatAssistant from '@/components/AIChatAssistant'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, empleado } = useAuth()
  const { synced } = useData()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  // Esperar: autenticación, datos sincronizados, y empleado cargado (excepto para admin que puede no tener empleado_id)
  const esperandoEmpleado = isAuthenticated && user?.role !== 'admin' && !empleado
  if (isLoading || !isAuthenticated || !synced || esperandoEmpleado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-700 gap-4">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        {!isLoading && isAuthenticated && !synced && (
          <p className="text-white/70 text-sm">Cargando datos...</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile drawer */}
      <div className={cn('lg:block', mobileOpen ? 'block' : 'hidden')}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Main area */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen flex flex-col',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]',
        )}
      >
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Asistente IA flotante */}
      <AIChatAssistant />
    </div>
  )
}
