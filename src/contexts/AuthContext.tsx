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
        // try/finally: si cualquier await lanza (error de red/RLS en loadProfile o
        // signOut), igual bajamos isLoading — de lo contrario el spinner queda infinito.
        try {
          if (session?.user) {
            // Si no hay "recordar sesión" activo ni marca de sesión activa en esta pestaña,
            // significa que el usuario cerró el navegador sin marcar "recordar" y la sesión
            // quedó guardada en localStorage. La invalidamos.
            const remember = localStorage.getItem('fno_remember') === '1'
            const sessionActive = sessionStorage.getItem('fno_session_active') === '1'
            if (!remember && !sessionActive) {
              await supabase!.auth.signOut()
              setAuth({ user: null, empleado: null, isAuthenticated: false })
              return
            }
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
        } catch (err) {
          console.error('[auth] error resolviendo sesión:', err)
        } finally {
          setIsLoading(false)
        }
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza el objeto empleado cuando DataContext termina de cargar.
  //
  // El sync masivo SÍ trae foto y foto_cover, así que acá se toma `emp` tal
  // cual. Antes se hacía `emp.foto || fotoCache.current?.foto || …`, una cadena
  // de fallbacks heredada de cuando el bulk fetch no las incluía. Con la cadena,
  // borrar la foto era imposible: el borrado dejaba `emp.foto` en '', este mismo
  // efecto se disparaba, y el '' caía al cache restaurando la foto vieja en el
  // header, el sidebar y el perfil. El DELETE sí había llegado a la base — sólo
  // mentía la pantalla, hasta recargar.
  useEffect(() => {
    if (!auth.user) return
    const emp = empleados.find(e => e.id === auth.user!.empleadoId)
    if (emp && emp !== auth.empleado) {
      // El cache sigue al dato, nunca al revés: si no, vuelve a quedar viejo.
      fotoCache.current = { foto: emp.foto ?? '', fotoCover: emp.fotoCover ?? '' }
      try {
        localStorage.setItem(`foto_cache_${emp.id}`,
          JSON.stringify({ foto: emp.foto ?? '', fotoCover: emp.fotoCover ?? '' }))
      } catch { /* localStorage no disponible */ }
      setAuth(prev => ({ ...prev, empleado: emp }))
    }
    // Depende también de auth.user: si `empleados` sincroniza ANTES de que
    // onAuthStateChange setee el user, sin esta dep el empleado quedaría en null.
  }, [empleados, auth.user?.empleadoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga foto/fotoCover del usuario logueado (no se incluyen en el fetch masivo para ahorrar bandwidth).
  // Aplica el cache de localStorage inmediatamente para evitar el delay visible,
  // luego actualiza desde Supabase en segundo plano y refresca el cache.
  useEffect(() => {
    if (!auth.user?.empleadoId || !supabase) return
    const cacheKey = `foto_cache_${auth.user.empleadoId}`

    // Aplicar cache local inmediatamente (aparece sin esperar a Supabase)
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { foto, fotoCover } = JSON.parse(cached) as { foto: string; fotoCover: string }
        fotoCache.current = { foto, fotoCover }
        setAuth(prev => prev.empleado
          ? { ...prev, empleado: { ...prev.empleado, foto, fotoCover } }
          : prev
        )
      }
    } catch { /* localStorage no disponible */ }

    // Fetch desde Supabase en segundo plano para tener la versión más reciente
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
          // Guardar en cache local para la próxima carga
          try { localStorage.setItem(cacheKey, JSON.stringify({ foto, fotoCover })) } catch { /* ignorar */ }
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
    remember: boolean,
  ): Promise<'ok' | 'pendiente' | 'error' | 'timeout' | 'desactivada'> => {
    const normalEmail = email.toLowerCase().trim()

    // Verificar pendientes (lista local, sin contraseñas)
    const pending = pendingRegistrations.find(p => p.email === normalEmail)
    if (pending) return 'pendiente'

    if (!supabase) return 'error'

    try {
      // Timeout de 15s: evita spinner infinito si Supabase está pausado o con latencia
      const timeout = new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 15000))
      // Guardar flags ANTES de llamar a Supabase: onAuthStateChange dispara un
      // setTimeout(0) durante signInWithPassword y necesita leer estos flags ya
      // presentes, o de lo contrario los ve vacíos y llama signOut() (race condition).
      if (remember) {
        localStorage.setItem('fno_remember', '1')
        sessionStorage.removeItem('fno_session_active')
      } else {
        localStorage.removeItem('fno_remember')
        sessionStorage.setItem('fno_session_active', '1')
      }

      const attempt = (async (): Promise<'ok' | 'error' | 'desactivada'> => {
        const { data, error } = await supabase!.auth.signInWithPassword({ email: normalEmail, password })
        if (error || !data.user) {
          // Limpiar flags si el login falla
          localStorage.removeItem('fno_remember')
          sessionStorage.removeItem('fno_session_active')
          return 'error'
        }
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
    localStorage.removeItem('fno_remember')
    sessionStorage.removeItem('fno_session_active')
    if (supabase) supabase.auth.signOut().catch(() => {})
    setAuth({ user: null, empleado: null, isAuthenticated: false })
  }, [])

  const updateEmpleado = useCallback((data: Partial<Empleado>) => {
    if (!auth.empleado) return
    updateEmpData(auth.empleado.id, data)
    setAuth(prev => {
      if (!prev.empleado) return prev
      const updated = { ...prev.empleado, ...data }
      // Actualizar cache local si cambia la foto
      if ('foto' in data || 'fotoCover' in data) {
        try {
          const cacheKey = `foto_cache_${prev.empleado.id}`
          localStorage.setItem(cacheKey, JSON.stringify({ foto: updated.foto ?? '', fotoCover: updated.fotoCover ?? '' }))
        } catch { /* ignorar */ }
      }
      return { ...prev, empleado: updated }
    })
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
