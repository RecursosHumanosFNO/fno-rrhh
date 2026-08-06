import { useCallback } from 'react'
import type { Empleado, User, PendingRegistration, AppNotification } from '@/types'
import { uid, hoyAR } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/authFetch'
import { sendEmail } from './email'
import { mapSupabaseToPending } from './mappers'

type AddNotification = (n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void

/**
 * Alta de acceso al portal: la persona se registra, queda pendiente y un
 * administrador aprueba o rechaza.
 */
export function usePendingRegistrationsCrud({
  setPending, pendingRef, setEmpleados, setUsers, addNotification,
}: {
  setPending: React.Dispatch<React.SetStateAction<PendingRegistration[]>>
  pendingRef: React.MutableRefObject<PendingRegistration[]>
  setEmpleados: React.Dispatch<React.SetStateAction<Empleado[]>>
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  addNotification: AddNotification
}) {
  const addPendingRegistration = useCallback((reg: Omit<PendingRegistration, 'id' | 'fechaSolicitud'>) => {
    const newReg: PendingRegistration = { ...reg, id: uid(), fechaSolicitud: hoyAR() }
    setPending(prev => [...prev, newReg])
    addNotification({ texto: `Nueva solicitud de acceso: ${reg.nombre} ${reg.apellido}`, tipo: 'registro', soloAdmin: true })
    if (supabase) {
      // La contraseña NO se guarda. Antes la elegía la persona al registrarse y
      // quedaba en claro en fno_pending, insertada desde el navegador con la
      // anon key y bajada de vuelta por el sync —que corre antes de
      // autenticar—, así que su confidencialidad dependía por completo de una
      // policy de RLS. Y como esa misma contraseña terminaba en Auth, leerla
      // era tomar la cuenta.
      //
      // Ahora la cuenta se crea con una contraseña temporal (create-auth-user
      // ya la genera si no le mandan ninguna) y la persona define la suya con
      // "Olvidé mi contraseña", que usa tokens de un solo uso.
      supabase.from('fno_pending').insert({
        id: newReg.id, nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni,
        email: reg.email, sector: reg.sector,
        cargo: reg.cargo, telefono: reg.telefono || '', fecha_solicitud: newReg.fechaSolicitud,
      }).then(({ error }) => { if (error) console.error('[supabase] insert fno_pending:', error) })
    }
    sendEmail('new_registration', { nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni, email: reg.email, sector: reg.sector, cargo: reg.cargo, telefono: reg.telefono || '' })
  }, [setPending, addNotification])

  const approvePendingRegistration = useCallback(async (id: string) => {
    const reg = pendingRef.current.find(p => p.id === id)
    if (!reg) return
    const empleadoId = uid()
    const hoy = hoyAR()
    const nuevoEmpleado: Empleado = {
      id: empleadoId, nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni,
      fechaNacimiento: '', email: reg.email, telefono: reg.telefono,
      direccion: '', foto: '', fotoCover: '', cuil: '',
      contactoEmergencia: { nombre: '', telefono: '', relacion: '' },
      sector: reg.sector, cargo: reg.cargo, cargosExtra: [], fechaIngreso: hoy,
      tipoContrato: 'Contrato', jornada: 'Full Time', supervisor: '',
      estado: 'activo',
    }
    const userId = uid()
    const nuevoUser: User = { id: userId, email: reg.email, role: 'employee', empleadoId }
    // Update optimista
    setEmpleados(prev => [...prev, nuevoEmpleado])
    setUsers(prev => [...prev, nuevoUser])
    setPending(prev => prev.filter(p => p.id !== id))

    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      const requesterId = session?.user?.id ?? ''

      // 1. Crear el empleado vía service role (evita que RLS bloquee el insert
      //    client-side en silencio y deje un login huérfano sin empleado)
      const empRes = await authFetch('/api/admin/create-empleado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId, empleado: nuevoEmpleado }),
      }).then(r => r.json()).catch(() => ({ ok: false, error: 'Error de conexión' }))

      if (!empRes.ok) {
        // Revertir el optimista: el registro sigue pendiente para reintentar
        console.error('[approve] create-empleado falló:', empRes.error)
        setEmpleados(prev => prev.filter(e => e.id !== empleadoId))
        setUsers(prev => prev.filter(u => u.id !== userId))
        setPending(prev => prev.some(p => p.id === id) ? prev : [reg, ...prev])
        addNotification({ texto: `No se pudo aprobar a ${reg.nombre} ${reg.apellido}: ${empRes.error}`, tipo: 'sistema', soloAdmin: true })
        return
      }

      // 2. Crear la cuenta de login (Supabase Auth + fno_users, contraseña encriptada)
      await authFetch('/api/admin/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Sin password: la genera el server y la persona la define por reset.
        body: JSON.stringify({ email: reg.email, userId, empleadoId, role: 'employee', requesterId }),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          console.error('[auth] create-auth-user falló:', r.status, err)
          addNotification({ texto: `${reg.nombre} se creó como empleado, pero no se pudo crear su cuenta de login. Usá "Crear cuenta de acceso" en su ficha.`, tipo: 'sistema', soloAdmin: true })
        }
      }).catch(err => console.error('[auth] create-auth-user error de red:', err))

      // 3. Quitar de pendientes en la base (recién ahora que el empleado sí persistió)
      supabase.from('fno_pending').delete().eq('id', id).then()
    }

    addNotification({ texto: `Acceso aprobado para ${reg.nombre} ${reg.apellido}`, tipo: 'registro', soloAdmin: true })
    sendEmail('registration_approved', { nombre: reg.nombre, email: reg.email })
  }, [setPending, addNotification, pendingRef])

  const refreshPending = useCallback(async () => {
    if (!supabase) return
    try {
      const { data } = await supabase.from('fno_pending')
        .select('id, nombre, apellido, dni, email, sector, cargo, telefono, fecha_solicitud')
      if (data) setPending(data.map(mapSupabaseToPending))
    } catch (e) { console.error('[sync] refreshPending error:', e) }
  }, [setPending])

  const rejectPendingRegistration = useCallback((id: string) => {
    const reg = pendingRef.current.find(p => p.id === id)
    setPending(prev => prev.filter(p => p.id !== id))
    if (reg) {
      addNotification({ texto: `Solicitud de acceso rechazada: ${reg.nombre} ${reg.apellido}`, tipo: 'registro', soloAdmin: true })
      if (supabase) supabase.from('fno_pending').delete().eq('id', id).then()
      sendEmail('registration_rejected', { nombre: reg.nombre, email: reg.email })
    }
  }, [setPending, addNotification, pendingRef])

  return {
    addPendingRegistration, approvePendingRegistration,
    rejectPendingRegistration, refreshPending,
  }
}
