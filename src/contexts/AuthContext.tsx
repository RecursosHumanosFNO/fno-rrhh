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
  const { empleados, pendingRegistrations, updateEmpleado: updateEmpData } = useData()

  const [auth, setAuth] = useState<AuthState>({
    user: null,
    empleado: null,
    isAuthenticated: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Restaurar sesión desde localStorage (el usuario completo se guarda sin contraseña)
  useEffect(() => {
    const stored = localStorage.getItem('fno_session')
    if (stored) {
      try {
        const session = JSON.parse(stored)
        // Formato nuevo: { userId, user: {...} } | Formato viejo: { userId }
        const user: User | undefined = session.user ?? undefined
        const empleado = empleados.find(e => e.id === user?.empleadoId)
        if (user && empleado) {
          setAuth({ user, empleado, isAuthenticated: true })
        } else {
          // Sesión inválida o empleado no encontrado → limpiar
          localStorage.removeItem('fno_session')
        }
      } catch {
        localStorage.removeItem('fno_session')
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

  const login = useCallback(async (email: string, password: string, _remember: boolean): Promise<'ok' | 'pendiente' | 'error'> => {
    const normalEmail = email.toLowerCase().trim()

    // Verificar si está en pendientes (lista local, sin contraseñas)
    const pending = pendingRegistrations.find(p => p.email === normalEmail)
    if (pending) return 'pendiente'

    // Validación server-side — las contraseñas nunca llegan al cliente
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) return 'error'

      const { user } = await res.json() as { user: User }
      if (!user) return 'error'

      const empleado = empleados.find(e => e.id === user.empleadoId)
      if (!empleado) return 'error'

      setAuth({ user, empleado, isAuthenticated: true })
      // Guardar usuario completo (sin contraseña) para restaurar sesión
      localStorage.setItem('fno_session', JSON.stringify({ userId: user.id, user }))
      return 'ok'
    } catch {
      return 'error'
    }
  }, [empleados, pendingRegistrations])

  const logout = useCallback(() => {
    setAuth({ user: null, empleado: null, isAuthenticated: false })
    localStorage.removeItem('fno_session')
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
