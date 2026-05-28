'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, Empleado, AuthState } from '@/types'
import { useData } from './DataContext'

interface AuthContextType extends AuthState {
  login: (email: string, password: string, remember: boolean) => Promise<'ok' | 'pendiente' | 'error'>
  logout: () => void
  updateEmpleado: (data: Partial<Empleado>) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { users, empleados, pendingRegistrations, updateEmpleado: updateEmpData } = useData()

  const [auth, setAuth] = useState<AuthState>({
    user: null,
    empleado: null,
    isAuthenticated: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('fno_session')
    if (stored) {
      try {
        const session = JSON.parse(stored)
        const user = users.find(u => u.id === session.userId)
        const empleado = empleados.find(e => e.id === user?.empleadoId)
        if (user && empleado) {
          setAuth({ user, empleado, isAuthenticated: true })
        }
      } catch {
        sessionStorage.removeItem('fno_session')
      }
    }
    setIsLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync empleado data cuando cambia en DataContext
  useEffect(() => {
    if (auth.user) {
      const updatedEmp = empleados.find(e => e.id === auth.user!.empleadoId)
      if (updatedEmp) setAuth(prev => ({ ...prev, empleado: updatedEmp }))
    }
  }, [empleados]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string, remember: boolean): Promise<'ok' | 'pendiente' | 'error'> => {
    const normalEmail = email.toLowerCase().trim()

    // Verificar si está en pendientes
    const pending = pendingRegistrations.find(p => p.email === normalEmail)
    if (pending) return 'pendiente'

    const user = users.find(u => u.email === normalEmail && u.password === password)
    if (!user) return 'error'

    const empleado = empleados.find(e => e.id === user.empleadoId)
    if (!empleado) return 'error'

    setAuth({ user, empleado, isAuthenticated: true })
    sessionStorage.setItem('fno_session', JSON.stringify({ userId: user.id }))
    return 'ok'
  }, [users, empleados, pendingRegistrations])

  const logout = useCallback(() => {
    setAuth({ user: null, empleado: null, isAuthenticated: false })
    sessionStorage.removeItem('fno_session')
  }, [])

  const updateEmpleado = useCallback((data: Partial<Empleado>) => {
    if (!auth.empleado) return
    updateEmpData(auth.empleado.id, data)
    setAuth(prev => prev.empleado ? { ...prev, empleado: { ...prev.empleado, ...data } } : prev)
  }, [auth.empleado, updateEmpData])

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, updateEmpleado, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
