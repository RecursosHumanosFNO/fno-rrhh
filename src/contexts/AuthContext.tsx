'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, Empleado, AuthState } from '@/types'
import { users, empleados } from '@/lib/mockData'

interface AuthContextType extends AuthState {
  login: (email: string, password: string, remember: boolean) => Promise<boolean>
  logout: () => void
  updateEmpleado: (data: Partial<Empleado>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    empleado: null,
    isAuthenticated: false,
  })

  useEffect(() => {
    const stored = localStorage.getItem('fno_session')
    if (stored) {
      try {
        const session = JSON.parse(stored)
        const user = users.find(u => u.id === session.userId)
        const empleado = empleados.find(e => e.id === user?.empleadoId)
        if (user && empleado) {
          setAuth({ user, empleado, isAuthenticated: true })
        }
      } catch {
        localStorage.removeItem('fno_session')
      }
    }
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean): Promise<boolean> => {
    const user = users.find(u => u.email === email.toLowerCase().trim() && u.password === password)
    if (!user) return false
    const empleado = empleados.find(e => e.id === user.empleadoId)
    if (!empleado) return false
    setAuth({ user, empleado, isAuthenticated: true })
    if (remember) {
      localStorage.setItem('fno_session', JSON.stringify({ userId: user.id }))
    }
    return true
  }, [])

  const logout = useCallback(() => {
    setAuth({ user: null, empleado: null, isAuthenticated: false })
    localStorage.removeItem('fno_session')
  }, [])

  const updateEmpleado = useCallback((data: Partial<Empleado>) => {
    setAuth(prev => prev.empleado ? { ...prev, empleado: { ...prev.empleado, ...data } } : prev)
  }, [])

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, updateEmpleado }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
