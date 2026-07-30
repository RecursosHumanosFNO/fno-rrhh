import { useCallback } from 'react'
import type { Empleado, Ticket, TicketEstado, AppNotification } from '@/types'
import { uid, hoyAR } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapTicketToSupabase } from './mappers'
import { sendEmail } from './email'

type AddNotification = (n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void

export function useTicketsCrud({ setTickets, ticketsRef, empleadosRef, addNotification }: {
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>
  ticketsRef: React.MutableRefObject<Ticket[]>
  empleadosRef: React.MutableRefObject<Empleado[]>
  addNotification: AddNotification
}) {
  const addTicket = useCallback((t: Omit<Ticket, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'estado'>) => {
    const hoy = hoyAR()
    const nuevo: Ticket = { ...t, id: uid(), estado: 'abierto', fechaCreacion: hoy, fechaActualizacion: hoy }
    setTickets(prev => [nuevo, ...prev])
    addNotification({ texto: `Nuevo ticket de RRHH: ${t.asunto}`, tipo: 'ticket', empleadoId: t.empleadoId })
    if (supabase) supabase.from('fno_tickets').insert(mapTicketToSupabase(nuevo)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_tickets:', error)
    })
  }, [setTickets, addNotification])

  /**
   * Responder un ticket.
   *
   * Antes el aviso al empleado y el email vivían dentro del updater de
   * setTickets, con un setEmpleados anidado adentro para leer el email del
   * destinatario: dos setters usados como lectores, uno dentro del otro, con
   * los efectos en medio. Ahora se lee de los refs y el updater sólo actualiza
   * la lista, que es lo único que le corresponde.
   */
  const respondTicket = useCallback((id: string, respuesta: string, estado: TicketEstado) => {
    const hoy = hoyAR()
    const ticket = ticketsRef.current.find(t => t.id === id)

    setTickets(prev => prev.map(t => t.id === id
      ? { ...t, respuesta, estado, fechaActualizacion: hoy }
      : t
    ))
    if (supabase) {
      supabase.from('fno_tickets')
        .update({ respuesta, estado, fecha_actualizacion: hoy })
        .eq('id', id).then()
    }

    if (!ticket) return

    const emp = empleadosRef.current.find(e => e.id === ticket.empleadoId)
    if (emp?.email) {
      sendEmail('ticket_respondido', {
        email: emp.email,
        nombre: `${emp.nombre} ${emp.apellido}`,
        asunto: ticket.asunto,
        respuesta,
        estado,
      })
    }
    addNotification({
      texto: `Tu pedido "${ticket.asunto}" recibió una respuesta de RRHH`,
      tipo: 'ticket', empleadoId: ticket.empleadoId, soloEmpleado: true,
    })
  }, [setTickets, ticketsRef, empleadosRef, addNotification])

  return { addTicket, respondTicket }
}
