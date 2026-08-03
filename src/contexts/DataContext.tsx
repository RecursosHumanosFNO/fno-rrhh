'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type {
  Empleado, Solicitud, Recibo, Novedad, Ticket, User, Evento,
  AppNotification, PendingRegistration, TicketEstado, UserRole,
  ReciboFirma, DesvinculacionInfo, RegistroNovedad,
} from '@/types'
import * as initial from '@/lib/mockData'
import { uid, hoyAR } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapNotifToSupabase } from './mappers'
import { useSupabaseSync } from './useSupabaseSync'
import { useRealtime } from './useRealtime'
import type { Setters } from './setters'
import { useSolicitudesCrud } from './useSolicitudesCrud'
import { useRecibosCrud } from './useRecibosCrud'
import { useTicketsCrud } from './useTicketsCrud'
import { useRefEspejo } from './useRefEspejo'
import { useAviso } from './useAviso'
import { useNovedadesCrud } from './useNovedadesCrud'
import { useEventosCrud } from './useEventosCrud'
import { useEmpleadosCrud } from './useEmpleadosCrud'
import { usePendingRegistrationsCrud } from './usePendingRegistrationsCrud'
import { useRegistrosNovedadCrud } from './useRegistrosNovedadCrud'

interface DataContextType {
  empleados: Empleado[]
  solicitudes: Solicitud[]
  recibos: Recibo[]
  novedades: Novedad[]
  eventos: Evento[]
  tickets: Ticket[]
  users: User[]
  pendingRegistrations: PendingRegistration[]
  notifications: AppNotification[]
  registrosNovedad: RegistroNovedad[]
  // Empleados
  addEmpleado: (e: Omit<Empleado, 'id'>) => string
  updateEmpleado: (id: string, data: Partial<Empleado>) => void
  deleteEmpleado: (id: string) => void
  desactivarEmpleado: (id: string, info: DesvinculacionInfo) => void
  reactivarEmpleado: (id: string) => void
  // Solicitudes
  addSolicitud: (s: Omit<Solicitud, 'id' | 'fechaCreacion' | 'estado'>) => void
  approveSolicitud: (id: string, comment: string) => void
  rejectSolicitud: (id: string, comment: string) => void
  editSolicitud: (id: string, estado: 'aprobado' | 'rechazado', comment: string) => void
  cancelSolicitud: (id: string) => void
  // Novedades
  addNovedad: (n: Omit<Novedad, 'id'>, notifyChannels?: ('app' | 'email')[]) => void
  updateNovedad: (id: string, data: Partial<Omit<Novedad, 'id'>>, notifyChannels?: ('app' | 'email')[]) => void
  deleteNovedad: (id: string) => void
  // Eventos
  addEvento: (e: Omit<Evento, 'id'>, notifyChannels?: ('app' | 'email')[]) => void
  updateEvento: (id: string, data: Partial<Omit<Evento, 'id'>>, notifyChannels?: ('app' | 'email')[]) => void
  deleteEvento: (id: string) => void
  // Recibos
  addRecibo: (r: Omit<Recibo, 'id'>) => void
  deleteRecibo: (id: string) => void
  // Firmas de recibos
  firmas: ReciboFirma[]
  firmarRecibo: (reciboId: string, empleadoId: string) => Promise<boolean>
  // Tickets
  addTicket: (t: Omit<Ticket, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'estado'>) => void
  respondTicket: (id: string, respuesta: string, estado: TicketEstado) => void
  // Usuarios / Registro
  setUserRole: (empleadoId: string, role: UserRole) => void
  addPendingRegistration: (reg: Omit<PendingRegistration, 'id' | 'fechaSolicitud'>) => void
  approvePendingRegistration: (id: string) => Promise<void>
  rejectPendingRegistration: (id: string) => void
  getUserByEmail: (email: string) => User | undefined
  getPendingByEmail: (email: string) => PendingRegistration | undefined
  refreshPending: () => Promise<void>
  // Notificaciones
  markNotificationRead: (id: string) => void
  markAllRead: () => void
  addNotification: (n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void
  // Registros de novedad (solo admin)
  addRegistroNovedad: (r: Omit<RegistroNovedad, 'id' | 'creadoEn'>) => Promise<string>
  updateRegistroNovedad: (id: string, data: Partial<Omit<RegistroNovedad, 'id' | 'creadoEn'>>) => void
  deleteRegistroNovedad: (id: string) => void
  // Estado de sync
  synced: boolean
  forceSync: () => Promise<void>
}

const DataContext = createContext<DataContextType | null>(null)






export function DataProvider({ children }: { children: React.ReactNode }) {
  // Supabase es la fuente de verdad — arrancamos con arrays vacíos y esperamos el sync
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [firmas, setFirmas] = useState<ReciboFirma[]>([])
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [eventos, setEventos] = useState<Evento[]>(initial.eventos) // feriados/actos siempre disponibles
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [pendingRegistrations, setPending] = useState<PendingRegistration[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [registrosNovedad, setRegistrosNovedad] = useState<RegistroNovedad[]>([])

  // Espejos para leer la lista al día dentro de callbacks (ver useRefEspejo).
  const empleadosRef = useRefEspejo(empleados)
  const ticketsRef = useRefEspejo(tickets)
  const novedadesRef = useRefEspejo(novedades)
  const eventosRef = useRefEspejo(eventos)
  const pendingRef = useRefEspejo(pendingRegistrations)
  const registrosRef = useRefEspejo(registrosNovedad)

  // ── Sync y Realtime ────────────────────────────────────────────────────────
  // Los setters de useState tienen identidad estable, así que el objeto se puede
  // armar inline: los hooks lo leen por ref y no lo usan como dependencia.
  const setters: Setters = {
    setEmpleados, setSolicitudes, setRecibos, setFirmas, setNovedades,
    setEventos, setTickets, setUsers, setPending, setNotifications,
    setRegistrosNovedad,
  }
  const { synced, syncFromSupabase } = useSupabaseSync(setters)
  useRealtime(setters, syncFromSupabase)

  // Sync entre pestañas lo maneja Supabase Realtime — no necesitamos storage events

  // ── Notificaciones ─────────────────────────────────────────────────────────
  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => {
    const notif: AppNotification = { ...n, id: uid(), fecha: hoyAR(), leida: false }
    setNotifications(prev => [notif, ...prev])
    if (supabase) {
      const sb = supabase
      sb.from('fno_notifs').insert(mapNotifToSupabase(notif)).then(({ error }) => {
        if (error) {
          console.warn('[supabase] insert fno_notifs (full):', error.message, error.code)
          // Retry sin columnas nuevas (por si la migración SQL todavía no se corrió)
          sb.from('fno_notifs').insert(mapNotifToSupabase(notif, true)).then(({ error: e2 }) => {
            if (e2) console.error('[supabase] insert fno_notifs (base):', e2.message, e2.code)
          })
        }
      })
    }
  }, [])

  // ── Empleados ──────────────────────────────────────────────────────────────
  const {
    addEmpleado, updateEmpleado, desactivarEmpleado, reactivarEmpleado, deleteEmpleado,
  } = useEmpleadosCrud({ setEmpleados, setUsers, empleadosRef, addNotification })


  // ── Solicitudes ────────────────────────────────────────────────────────────
  const {
    addSolicitud, approveSolicitud, rejectSolicitud, editSolicitud, cancelSolicitud,
  } = useSolicitudesCrud({ solicitudes, setSolicitudes, empleadosRef, addNotification })

  // Notificador compartido por novedades y eventos (mismo formato de aviso).
  const aviso = useAviso({ empleadosRef, addNotification })

  // ── Novedades ──────────────────────────────────────────────────────────────
  const { addNovedad, updateNovedad, deleteNovedad } = useNovedadesCrud({
    setNovedades, novedadesRef, aviso,
  })


  // ── Eventos (CRUD) ─────────────────────────────────────────────────────────
  const { addEvento, updateEvento, deleteEvento } = useEventosCrud({
    setEventos, eventosRef, aviso,
  })


  // ── Recibos ────────────────────────────────────────────────────────────────
  const { addRecibo, deleteRecibo, firmarRecibo } = useRecibosCrud({
    setRecibos, setFirmas, empleadosRef, addNotification,
  })

  // ── Tickets ────────────────────────────────────────────────────────────────
  const { addTicket, respondTicket } = useTicketsCrud({
    setTickets, ticketsRef, empleadosRef, addNotification,
  })

  // ── Usuarios ───────────────────────────────────────────────────────────────
  const setUserRole = useCallback((empleadoId: string, role: UserRole) => {
    setUsers(prev => prev.map(u => u.empleadoId === empleadoId ? { ...u, role } : u))
  }, [])

  const getUserByEmail = useCallback((email: string) =>
    users.find(u => u.email === email.toLowerCase().trim()), [users])

  const getPendingByEmail = useCallback((email: string) =>
    pendingRegistrations.find(p => p.email === email.toLowerCase().trim()), [pendingRegistrations])

  // ── Registro pendiente ─────────────────────────────────────────────────────
  const {
    addPendingRegistration, approvePendingRegistration,
    rejectPendingRegistration, refreshPending,
  } = usePendingRegistrationsCrud({
    setPending, pendingRef, setEmpleados, setUsers, addNotification,
  })


  // ── Registros de Novedad (solo admin) ─────────────────────────────────────
  const {
    addRegistroNovedad, updateRegistroNovedad, deleteRegistroNovedad,
  } = useRegistrosNovedadCrud({ setRegistrosNovedad, registrosRef })


  // ── Notificaciones ─────────────────────────────────────────────────────────
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    if (supabase) supabase.from('fno_notifs').update({ leida: true }).eq('id', id).then()
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
    if (supabase) supabase.from('fno_notifs').update({ leida: true }).eq('leida', false).then()
  }, [])

  return (
    <DataContext.Provider value={{
      empleados, solicitudes, recibos, novedades, eventos, tickets, users,
      pendingRegistrations, notifications, registrosNovedad,
      addEmpleado, updateEmpleado, deleteEmpleado, desactivarEmpleado, reactivarEmpleado,
      addSolicitud, approveSolicitud, rejectSolicitud, editSolicitud, cancelSolicitud,
      addNovedad, updateNovedad, deleteNovedad,
      addEvento, updateEvento, deleteEvento,
      addRecibo, deleteRecibo, firmas, firmarRecibo,
      addTicket, respondTicket,
      setUserRole, getUserByEmail, getPendingByEmail,
      addPendingRegistration, approvePendingRegistration, rejectPendingRegistration, refreshPending,
      markNotificationRead, markAllRead, addNotification,
      addRegistroNovedad, updateRegistroNovedad, deleteRegistroNovedad,
      synced, forceSync: syncFromSupabase,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
