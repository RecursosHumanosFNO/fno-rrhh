import { useCallback } from 'react'
import type { Empleado, Solicitud, AppNotification } from '@/types'
import { uid, hoyAR, SOLICITUD_TIPO_LABEL } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapSolicitudToSupabase } from './mappers'
import { sendEmail } from './email'

type AddNotification = (n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void

function label(tipo: string): string {
  return SOLICITUD_TIPO_LABEL[tipo as keyof typeof SOLICITUD_TIPO_LABEL] ?? tipo
}

/**
 * CRUD de solicitudes.
 *
 * `empleadosRef` en vez del array: aprobar o rechazar necesita los datos del
 * empleado para el email, y leerlos del estado capturado dejaría el callback
 * atado a una versión vieja de la lista. Antes esto se resolvía llamando a
 * setEmpleados con un updater que no modificaba nada y sólo servía para espiar
 * el valor actual — un setter usado como lector, con el envío del mail metido
 * adentro. React puede invocar esos updaters más de una vez, así que los
 * efectos no tienen nada que hacer ahí.
 */
export function useSolicitudesCrud({ solicitudes, setSolicitudes, empleadosRef, addNotification }: {
  solicitudes: Solicitud[]
  setSolicitudes: React.Dispatch<React.SetStateAction<Solicitud[]>>
  empleadosRef: React.MutableRefObject<Empleado[]>
  addNotification: AddNotification
}) {
  const addSolicitud = useCallback((s: Omit<Solicitud, 'id' | 'fechaCreacion' | 'estado'>) => {
    const nueva: Solicitud = { ...s, id: uid(), estado: 'pendiente', fechaCreacion: hoyAR() }
    const tipoLabel = label(s.tipo)
    setSolicitudes(prev => [nueva, ...prev])

    // Confirmación al empleado
    addNotification({
      texto: `Tu solicitud de ${tipoLabel} fue enviada y está pendiente de revisión`,
      tipo: 'solicitud', empleadoId: s.empleadoId, soloEmpleado: true,
    })

    // Alerta al admin + email
    const emp = empleadosRef.current.find(e => e.id === s.empleadoId)
    const nombreEmp = emp ? `${emp.nombre} ${emp.apellido}` : 'Empleado'
    addNotification({ texto: `Nueva solicitud de ${nombreEmp}: ${tipoLabel}`, tipo: 'solicitud', soloAdmin: true })
    sendEmail('new_solicitud', {
      nombre: nombreEmp,
      cargo: emp?.cargo ?? '',
      sector: emp?.sector ?? '',
      tipo: tipoLabel,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin ?? '',
      horarioDesde: s.horarioDesde ?? '',
      horarioHasta: s.horarioHasta ?? '',
      descripcion: s.descripcion,
    })

    if (supabase) {
      const sb = supabase
      sb.from('fno_solicitudes').insert(mapSolicitudToSupabase(nueva)).then(({ error }) => {
        if (!error) return
        console.warn('[supabase] insert fno_solicitudes (full):', error.message, error.code)
        // Reintento sin las columnas de horario, por si falta la migración.
        sb.from('fno_solicitudes').insert(mapSolicitudToSupabase(nueva, true)).then(({ error: e2 }) => {
          if (e2) console.error('[supabase] insert fno_solicitudes (base):', e2.message, e2.code)
        })
      })
    }
  }, [setSolicitudes, addNotification, empleadosRef])

  /**
   * Resolver una solicitud: aprobar, rechazar y editar hacían exactamente lo
   * mismo salvo el texto que ve el empleado y si se avisa o no al admin.
   */
  const resolver = useCallback((
    id: string,
    estado: 'aprobado' | 'rechazado',
    comment: string,
    opciones: { textoEmpleado: string; avisoAdmin?: (nombre: string) => string },
  ) => {
    const fechaRes = hoyAR()
    setSolicitudes(prev => prev.map(s => s.id === id
      ? { ...s, estado, fechaResolucion: fechaRes, comentarioAdmin: comment }
      : s
    ))
    if (supabase) {
      supabase.from('fno_solicitudes')
        .update({ estado, fecha_resolucion: fechaRes, comentario_admin: comment })
        .eq('id', id).then()
    }

    const sol = solicitudes.find(s => s.id === id)
    if (!sol) return

    addNotification({ texto: opciones.textoEmpleado, tipo: 'solicitud', empleadoId: sol.empleadoId, soloEmpleado: true })

    const emp = empleadosRef.current.find(e => e.id === sol.empleadoId)
    const nombreEmp = emp ? `${emp.nombre} ${emp.apellido}` : 'el empleado'
    if (opciones.avisoAdmin) {
      addNotification({ texto: opciones.avisoAdmin(nombreEmp), tipo: 'solicitud', soloAdmin: true })
    }
    if (emp?.email) {
      sendEmail('solicitud_resuelta', {
        email: emp.email, nombre: nombreEmp, tipo: label(sol.tipo), estado, comentario: comment,
      })
    }
  }, [solicitudes, setSolicitudes, addNotification, empleadosRef])

  const approveSolicitud = useCallback((id: string, comment: string) => {
    resolver(id, 'aprobado', comment, {
      textoEmpleado: 'Tu solicitud fue aprobada ✓',
      avisoAdmin: nombre => `Solicitud de ${nombre} aprobada y notificada`,
    })
  }, [resolver])

  const rejectSolicitud = useCallback((id: string, comment: string) => {
    resolver(id, 'rechazado', comment, {
      textoEmpleado: 'Tu solicitud fue rechazada',
      avisoAdmin: nombre => `Solicitud de ${nombre} rechazada y notificada`,
    })
  }, [resolver])

  // Editar una resolución ya tomada: al admin no se le avisa, porque es él
  // mismo quien la está cambiando.
  const editSolicitud = useCallback((id: string, estado: 'aprobado' | 'rechazado', comment: string) => {
    resolver(id, estado, comment, {
      textoEmpleado: estado === 'aprobado'
        ? 'Tu solicitud fue actualizada: aprobada ✓'
        : 'Tu solicitud fue actualizada: rechazada',
    })
  }, [resolver])

  const cancelSolicitud = useCallback((id: string) => {
    setSolicitudes(prev => prev.filter(s => s.id !== id))
    if (supabase) supabase.from('fno_solicitudes').delete().eq('id', id).then()
  }, [setSolicitudes])

  return { addSolicitud, approveSolicitud, rejectSolicitud, editSolicitud, cancelSolicitud }
}
