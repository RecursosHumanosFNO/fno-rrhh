import type {
  Empleado, Solicitud, Recibo, Novedad, Ticket, User, Evento,
  AppNotification, PendingRegistration, ReciboFirma, RegistroNovedad,
} from '@/types'

type Set<T> = React.Dispatch<React.SetStateAction<T>>

/**
 * Los setters de todas las listas del contexto, en una sola bolsa.
 *
 * Tanto el sync completo como el handler de Realtime escriben sobre las mismas
 * once listas, así que pasarlos de a uno serían once parámetros repetidos en
 * dos hooks. Los setters de useState tienen identidad estable, con lo cual el
 * objeto se puede armar inline en el provider sin memoizar.
 */
export interface Setters {
  setEmpleados: Set<Empleado[]>
  setSolicitudes: Set<Solicitud[]>
  setRecibos: Set<Recibo[]>
  setFirmas: Set<ReciboFirma[]>
  setNovedades: Set<Novedad[]>
  setEventos: Set<Evento[]>
  setTickets: Set<Ticket[]>
  setUsers: Set<User[]>
  setPending: Set<PendingRegistration[]>
  setNotifications: Set<AppNotification[]>
  setRegistrosNovedad: Set<RegistroNovedad[]>
}
