'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, Empleado, AuthState, UserRole } from '@/types'
import { useData } from './DataContext'
import { supabase } from '@/lib/supabase'

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

  // Obtiene el perfil del usuario desde fno_users usando su Supabase Auth ID
  const loadProfile = useCallback(async (authUserId: string): Promise<User | null> => {
    if (!supabase) return null
    const { data } = await supabase
      .from('fno_users')
      .select('id, email, role, empleado_id')
      .eq('auth_id', authUserId)
      .maybeSingle()
    if (!data) return null
    return {
      id: data.id as string,
      email: data.email as string,
      role: data.role as UserRole,
      empleadoId: data.empleado_id as string,
    }
  }, [])

  // Escucha cambios de sesión de Supabase Auth (login, logout, refresco de token)
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = await loadProfile(session.user.id)
        if (user) {
          setAuth(prev => ({
            user,
            // Si ya teníamos el empleado cargado, lo mantenemos; sino lo sincroniza el efecto de abajo
            empleado: prev.empleado?.id === user.empleadoId ? prev.empleado : null,
            isAuthenticated: true,
          }))
        } else {
          // Auth válido pero sin perfil en fno_users (no debería ocurrir en uso normal)
          setAuth({ user: null, empleado: null, isAuthenticated: false })
        }
      } else {
        setAuth({ user: null, empleado: null, isAuthenticated: false })
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza el objeto empleado cuando DataContext termina de cargar
  useEffect(() => {
    if (!auth.user) return
    const emp = empleados.find(e => e.id === auth.user!.empleadoId)
    if (emp && emp !== auth.empleado) {
      setAuth(prev => ({ ...prev, empleado: emp }))
    }
  }, [empleados]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (
    email: string,
    password: string,
    _remember: boolean,
  ): Promise<'ok' | 'pendiente' | 'error'> => {
    const normalEmail = email.toLowerCase().trim()

    // Verificar pendientes (lista local, sin contraseñas)
    const pending = pendingRegistrations.find(p => p.email === normalEmail)
    if (pending) return 'pendiente'

    if (!supabase) return 'error'

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: normalEmail, password })
      if (error) return 'error'
      // onAuthStateChange maneja el estado auth automáticamente
      return 'ok'
    } catch {
      return 'error'
    }
  }, [pendingRegistrations])

  const logout = useCallback(() => {
    if (supabase) supabase.auth.signOut().catch(() => {})
    setAuth({ user: null, empleado: null, isAuthenticated: false })
  }, [])

  const updateEmpleado = useCallback((data: Partial<Empleado>) => {
    if (!auth.empleado) return
    updateEmpData(auth.empleado.id, data)
    setAuth(prev => prev.empleado
      ? { ...prev, empleado: { ...prev.empleado, ...data } }
      : prev
    )
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
