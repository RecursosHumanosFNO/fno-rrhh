'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { User, Empleado, AuthState, UserRole } from '@/types'
import { useData } from './DataContext'
import { supabase } from '@/lib/supabase'
import { marcarRecordar } from '@/lib/authStorage'
import { authFetch } from '@/lib/authFetch'

interface AuthContextType extends AuthState {
  loginConGoogle: () => Promise<string | null>
  logout: () => void
  /** En qué punto del camino Google → datos → RRHH → portal está esta sesión. */
  estadoAcceso: 'ok' | 'sin-cuenta' | 'pendiente' | 'rechazado'
  /** Por qué una sesión válida no da acceso (cuenta desactivada, por ejemplo). */
  motivoRechazo: string
  /** Lo que Google ya sabe de la persona, para precargar el formulario de datos. */
  datosGoogle: { email: string; nombre: string; apellido: string } | null
  updateEmpleado: (data: Partial<Empleado>) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { empleados, updateEmpleado: updateEmpData } = useData()

  const [auth, setAuth] = useState<AuthState>({
    user: null,
    empleado: null,
    isAuthenticated: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  // El callback de onAuthStateChange corre diferido y con el closure del render
  // en que se suscribió: sin el ref leería siempre el estado inicial.
  const estadoRef = useRef<'ok' | 'sin-cuenta' | 'pendiente' | 'rechazado'>('ok')
  // Cache foto/fotoCover fetched async so they survive the empleado sync race
  const fotoCache = useRef<{ foto: string; fotoCover: string } | null>(null)

  // En qué punto del camino está alguien con sesión de Google válida:
  //   'sin-cuenta' → entró, pero todavía no cargó sus datos (va al formulario)
  //   'pendiente'  → ya los cargó y espera que RRHH lo apruebe
  //   'rechazado'  → cuenta desactivada o correo sin verificar: no pasa
  // El flujo es Google → datos → RRHH → portal, así que los dos primeros no son
  // un rechazo sino un paso intermedio, y echarlos al login sería dejarlos sin
  // forma de avanzar.
  const [estadoAcceso, setEstadoAccesoRaw] = useState<'ok' | 'sin-cuenta' | 'pendiente' | 'rechazado'>('ok')
  const setEstadoAcceso = useCallback((v: 'ok' | 'sin-cuenta' | 'pendiente' | 'rechazado') => {
    estadoRef.current = v
    setEstadoAccesoRaw(v)
  }, [])
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [datosGoogle, setDatosGoogle] = useState<{ email: string; nombre: string; apellido: string } | null>(null)

  // Obtiene el perfil del usuario desde fno_users usando su Supabase Auth ID
  const loadProfile = useCallback(async (authUserId: string): Promise<User | null> => {
    if (!supabase) return null

    const buscar = async () => {
      const { data } = await supabase!
        .from('fno_users')
        .select('id, email, role, empleado_id')
        .eq('auth_id', authUserId)
        .maybeSingle()
      return data
    }

    let data = await buscar()

    // Sin fila para este auth_id puede ser una primera entrada con Google:
    // Supabase le dio a la misma persona un id nuevo, distinto del que tiene
    // guardado su cuenta del portal. El server decide si corresponde atarlos
    // —sólo si el email ya pertenece a un acceso aprobado y verificado— y
    // recién ahí volvemos a buscar.
    if (!data) {
      try {
        const res = await authFetch('/api/auth/vincular', { method: 'POST' })
        const cuerpo = await res.json().catch(() => ({}))
        if (res.ok && cuerpo.ok) {
          data = await buscar()
        } else if (cuerpo.motivo === 'sin-cuenta' || cuerpo.motivo === 'pendiente') {
          setEstadoAcceso(cuerpo.motivo)
          setDatosGoogle({
            email: String(cuerpo.email ?? ''),
            nombre: String(cuerpo.nombre ?? ''),
            apellido: String(cuerpo.apellido ?? ''),
          })
        } else {
          setEstadoAcceso('rechazado')
          if (cuerpo.error) setMotivoRechazo(String(cuerpo.error))
        }
      } catch { /* sin red: se resuelve como "sin perfil", igual que antes */ }
    }

    if (!data) return null
    setEstadoAcceso('ok')
    setMotivoRechazo('')
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
            // Acá ya no se decide nada sobre "recordar sesión": si Supabase
            // pudo restaurar la sesión es porque estaba donde tenía que estar
            // (ver src/lib/authStorage.ts). Antes había un signOut() en este
            // punto que, ante cualquier flag perdido, echaba a un usuario con
            // sesión válida.
            const user = await loadProfile(session.user.id)
            if (user) {
              setAuth(prev => ({
                user,
                empleado: prev.empleado?.id === user.empleadoId ? prev.empleado : null,
                isAuthenticated: true,
              }))
            } else {
              setAuth({ user: null, empleado: null, isAuthenticated: false })
              // La sesión se cierra SÓLO cuando no hay nada más que hacer
              // (cuenta desactivada, correo sin verificar). Si la persona
              // todavía tiene que cargar sus datos o espera la aprobación de
              // RRHH, la sesión es justamente lo que le permite seguir: cerrarla
              // la devolvería al login en loop, sin forma de avanzar.
              if (estadoRef.current === 'rechazado') {
                supabase?.auth.signOut().catch(() => {})
              }
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


  /**
   * Entrar con la cuenta de Google.
   *
   * Devuelve un mensaje de error, o null si la redirección arrancó bien (en ese
   * caso el navegador se va a Google y no vuelve por acá).
   *
   * Quién puede entrar no lo decide Google: lo decide RRHH. Google sólo prueba
   * que la persona es dueña de ese correo; que ese correo tenga acceso al
   * portal se verifica después, del lado del server (ver /api/auth/vincular).
   */
  const loginConGoogle = useCallback(async (): Promise<string | null> => {
    if (!supabase) return 'No se pudo conectar.'
    // Entrar con Google es un gesto explícito de "esta es mi máquina": se
    // recuerda la sesión, igual que el check tildado por defecto del formulario.
    marcarRecordar(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        // Muestra el selector de cuentas: en un celular compartido o con varias
        // cuentas de Google encima, entrar con la equivocada y no entender por
        // qué el portal te rechaza es el error más fácil de cometer.
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      marcarRecordar(false)
      return error.message || 'No se pudo abrir el acceso con Google.'
    }
    return null
  }, [])

  const logout = useCallback(() => {
    marcarRecordar(false)
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
    <AuthContext.Provider value={{ ...auth, loginConGoogle, logout, updateEmpleado, isLoading, estadoAcceso, motivoRechazo, datosGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
