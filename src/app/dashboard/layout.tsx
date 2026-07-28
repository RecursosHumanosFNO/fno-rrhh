'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import PullToRefresh from '@/components/PullToRefresh'
import { PushPrompt } from '@/components/PushPrompt'
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
      {/* Mobile overlay — fade in/out */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar — always in DOM; slides on mobile, collapses on desktop */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed(!collapsed)}
      />

      {/* Main area shifts right on desktop */}
      <div className={cn('sidebar-main min-h-screen flex flex-col', collapsed && 'sidebar-collapsed')}>
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 [overflow-x:clip]">
          <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <PushPrompt empleadoId={empleado?.id} />
          </div>
          {children}
        </main>
      </div>

      <PullToRefresh />
    </div>
  )
}
