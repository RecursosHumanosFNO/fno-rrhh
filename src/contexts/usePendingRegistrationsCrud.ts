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
      // Ahora la cuenta se crea con una contraseña temporal que nadie conoce
      // (create-auth-user ya la genera si no le mandan ninguna) y la persona
      // define la suya con el link de invitación que le llega por mail.
      supabase.from('fno_pending').insert({
        id: newReg.id, nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni,
        email: reg.email, sector: reg.sector,
        cargo: reg.cargo, telefono: reg.telefono || '', fecha_solicitud: newReg.fechaSolicitud,
      }).then(({ error }) => { if (error) console.error('[supabase] insert fno_pending:', error) })
    }
    sendEmail('new_registration', { nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni, email: reg.email, sector: reg.sector, cargo: reg.cargo, telefono: reg.telefono || '' })
  }, [setPending, addNotification])

  // Devuelve null si salió todo bien, o el texto del problema. Antes no
  // devolvía nada y los errores iban sólo a la campanita: la solicitud
  // desaparecía de la lista, la pantalla parecía aprobada, y la persona
  // seguía sin poder entrar sin que nadie se enterara del porqué.
  const approvePendingRegistration = useCallback(async (id: string): Promise<string | null> => {
    const reg = pendingRef.current.find(p => p.id === id)
    if (!reg) return 'No se encontró la solicitud. Recargá la página e intentá de nuevo.'
    let empleadoId = uid()
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
      const revertir = () => {
        setEmpleados(prev => prev.filter(e => e.id !== nuevoEmpleado.id))
        setUsers(prev => prev.filter(u => u.id !== userId))
        setPending(prev => prev.some(p => p.id === id) ? prev : [reg, ...prev])
      }

      const empRes = await authFetch('/api/admin/create-empleado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // reusarSiExiste: si un intento anterior dejó el legajo creado y la
        // cuenta no, se sigue con ese legajo en vez de cortar por duplicado.
        body: JSON.stringify({ requesterId, empleado: nuevoEmpleado, reusarSiExiste: true }),
      }).then(r => r.json()).catch(() => ({ ok: false, error: 'Error de conexión' }))

      if (!empRes.ok) {
        // Revertir el optimista: el registro sigue pendiente para reintentar
        console.error('[approve] create-empleado falló:', empRes.error)
        revertir()
        const msg = `No se pudo aprobar a ${reg.nombre} ${reg.apellido}: ${empRes.error}`
        addNotification({ texto: msg, tipo: 'sistema', soloAdmin: true })
        return msg
      }

      // Si el legajo ya existía, la cuenta va atada a ESE, no al id nuevo que
      // armamos acá; y el optimista de recién sobra (sería un duplicado).
      if (empRes.existente && empRes.id) {
        setEmpleados(prev => prev.filter(e => e.id !== nuevoEmpleado.id))
        empleadoId = String(empRes.id)
      }

      // 2. Crear la cuenta de login (Supabase Auth + fno_users)
      let errCuenta: string | null = null
      let invitacionEnviada: boolean | null = null
      try {
        const r = await authFetch('/api/admin/create-auth-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Sin password: la genera el server; la persona entra con Google.
          body: JSON.stringify({ email: reg.email, userId, empleadoId, role: 'employee', requesterId }),
        })
        const cuerpo = await r.json().catch(() => ({}))
        if (!r.ok || !cuerpo.ok) {
          console.error('[auth] create-auth-user falló:', r.status, cuerpo)
          errCuenta = String(cuerpo.error ?? `error ${r.status}`)
        } else {
          invitacionEnviada = cuerpo.invitacionEnviada ?? null
        }
      } catch (err) {
        console.error('[auth] create-auth-user error de red:', err)
        errCuenta = 'error de conexión'
      }

      if (errCuenta) {
        // La solicitud NO se borra: queda en la lista para volver a aprobar,
        // que ahora sí funciona (reusa el legajo y completa la cuenta). Antes
        // se borraba igual y la persona quedaba sin solicitud y sin cuenta.
        revertir()
        const msg = `${reg.nombre} ${reg.apellido}: se creó el legajo pero no la cuenta de acceso (${errCuenta}). Volvé a tocar Aprobar.`
        addNotification({ texto: msg, tipo: 'sistema', soloAdmin: true })
        return msg
      }

      // 3. Recién ahora, con legajo y cuenta, se quita de pendientes.
      supabase.from('fno_pending').delete().eq('id', id).then()

      if (invitacionEnviada === false) {
        addNotification({
          texto: `La cuenta de ${reg.nombre} se creó, pero no se pudo enviar el aviso por mail. Decile que ya puede entrar con su cuenta de Google.`,
          tipo: 'sistema', soloAdmin: true,
        })
      }
    }

    addNotification({ texto: `Acceso aprobado para ${reg.nombre} ${reg.apellido}`, tipo: 'registro', soloAdmin: true })
    return null
    // El mail de bienvenida lo manda create-auth-user junto con el link para
    // crear la contraseña. Mandar además el de "acceso aprobado" serían dos
    // correos seguidos diciendo lo mismo, y el útil es el que trae el link.
  }, [setPending, addNotification, pendingRef])

  const refreshPending = useCallback(async () => {
    if (!supabase) return
    try {
      const res = await authFetch('/api/pendientes')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setPending(data.map(mapSupabaseToPending))
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
