'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { User, Empleado, AuthState, UserRole } from '@/types'
import { useData } from './DataContext'
import { supabase } from '@/lib/supabase'

interface AuthContextType extends AuthState {
  login: (email: string, password: string, remember: boolean) => Promise<'ok' | 'pendiente' | 'error' | 'timeout' | 'desactivada'>
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
  // Cache foto/fotoCover fetched async so they survive the empleado sync race
  const fotoCache = useRef<{ foto: string; fotoCover: string } | null>(null)

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Diferir con setTimeout(0): NO ejecutar trabajo async dentro del callback,
      // porque Supabase mantiene un lock interno y se produce un deadlock
      // (ej: updateUser/signIn quedan colgados). Al diferir, el lock se libera.
      setTimeout(async () => {
        if (session?.user) {
          const user = await loadProfile(session.user.id)
          if (user) {
            setAuth(prev => ({
              user,
              empleado: prev.empleado?.id === user.empleadoId ? prev.empleado : null,
              isAuthenticated: true,
            }))
          } else {
            setAuth({ user: null, empleado: null, isAuthenticated: false })
          }
        } else {
          setAuth({ user: null, empleado: null, isAuthenticated: false })
        }
        setIsLoading(false)
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza el objeto empleado cuando DataContext termina de cargar.
  // Preserva foto/fotoCover del cache ref — el bulk fetch no las incluye para ahorrar bandwidth.
  useEffect(() => {
    if (!auth.user) return
    const emp = empleados.find(e => e.id === auth.user!.empleadoId)
    if (emp && emp !== auth.empleado) {
      setAuth(prev => ({
        ...prev,
        empleado: {
          ...emp,
          foto: emp.foto || fotoCache.current?.foto || prev.empleado?.foto || '',
          fotoCover: emp.fotoCover || fotoCache.current?.fotoCover || prev.empleado?.fotoCover || '',
        },
      }))
    }
  }, [empleados]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga foto/fotoCover del usuario logueado (no se incluyen en el fetch masivo para ahorrar bandwidth).
  // Guarda el resultado en fotoCache.current para que el sync de empleados pueda aplicarlo
  // aunque llegue antes de que DataContext haya poblado auth.empleado.
  useEffect(() => {
    if (!auth.user?.empleadoId || !supabase) return
    fotoCache.current = null
    supabase
      .from('fno_empleados')
      .select('foto, foto_cover')
      .eq('id', auth.user.empleadoId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const foto = (data.foto as string) ?? ''
          const fotoCover = (data.foto_cover as string) ?? ''
          fotoCache.current = { foto, fotoCover }
          setAuth(prev => prev.empleado
            ? { ...prev, empleado: { ...prev.empleado, foto, fotoCover } }
            : prev
          )
        }
      })
  }, [auth.user?.empleadoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (
    email: string,
    password: string,
    _remember: boolean,
  ): Promise<'ok' | 'pendiente' | 'error' | 'timeout' | 'desactivada'> => {
    const normalEmail = email.toLowerCase().trim()

    // Verificar pendientes (lista local, sin contraseñas)
    const pending = pendingRegistrations.find(p => p.email === normalEmail)
    if (pending) return 'pendiente'

    if (!supabase) return 'error'

    try {
      // Timeout de 15s: evita spinner infinito si Supabase está pausado o con latencia
      const timeout = new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 15000))
      const attempt = (async (): Promise<'ok' | 'error' | 'desactivada'> => {
        const { data, error } = await supabase!.auth.signInWithPassword({ email: normalEmail, password })
        if (error || !data.user) return 'error'
        // Cargar el perfil y dejar la sesión lista ANTES de devolver 'ok'.
        // (onAuthStateChange está diferido, así que sin esto el dashboard
        //  no vería isAuthenticated=true al primer intento)
        const profile = await loadProfile(data.user.id)
        if (!profile) return 'error'
        // Verificar directamente en Supabase para evitar race condition con el sync
        const { data: empRow } = await supabase!
          .from('fno_empleados').select('estado, nombre, apellido').eq('id', profile.empleadoId).maybeSingle()
        if (empRow?.estado === 'inactivo') {
          await supabase!.auth.signOut()
          return 'desactivada'
        }
        const emp = empleados.find(e => e.id === profile.empleadoId) ?? null
        setAuth({ user: profile, empleado: emp, isAuthenticated: true })
        // Registrar login en fno_logins (no bloquea el flujo).
        // Nombre tomado de la query directa (no del sync) para no caer al email
        // cuando el listado de empleados aún no terminó de cargar.
        const nombreLogin = empRow?.nombre
          ? `${empRow.nombre} ${empRow.apellido ?? ''}`.trim()
          : emp ? `${emp.nombre} ${emp.apellido}` : normalEmail
        supabase!.from('fno_logins').insert({
          empleado_id: profile.empleadoId,
          nombre: nombreLogin,
          email: normalEmail,
        }).then()
        return 'ok'
      })().catch(() => 'error' as const)
      return await Promise.race([attempt, timeout])
    } catch {
      return 'error'
    }
  }, [pendingRegistrations, empleados, loadProfile])

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
