'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  Empleado, Solicitud, Recibo, Novedad, Ticket, User, Evento,
  AppNotification, PendingRegistration, TicketEstado, UserRole, EmpleadoEstado,
  ReciboFirma, DesvinculacionInfo, RegistroNovedad,
} from '@/types'
import * as initial from '@/lib/mockData'
import { uid, hoyAR } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/authFetch'
import {
  mapEmpleadoToSupabase,
  mapNotifToSupabase,
  mapRegistroNovedadToSupabase,
  mapSupabaseToEmpleado,
  mapSupabaseToEvento,
  mapSupabaseToNotif,
  mapSupabaseToNovedad,
  mapSupabaseToRecibo,
  mapSupabaseToRegistroNovedad,
  mapSupabaseToSolicitud,
  mapSupabaseToTicket,
} from './mappers'
import { upsert, upsertHead } from './listas'
import { sendEmail } from './email'
import { useSolicitudesCrud } from './useSolicitudesCrud'
import { useRecibosCrud } from './useRecibosCrud'
import { useTicketsCrud } from './useTicketsCrud'
import { useRefEspejo } from './useRefEspejo'
import { useAviso } from './useAviso'
import { useNovedadesCrud } from './useNovedadesCrud'
import { useEventosCrud, EVENTOS_FIJOS_IDS } from './useEventosCrud'

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




// Persiste cambios de un empleado vía service role (/api/perfil), bypaseando RLS.
// Los upserts client-side con anon key se bloquean silenciosamente, así que las
// escrituras importantes (estado, desvinculación) deben ir por el endpoint.
// Devuelve true si el server confirmó el guardado. Los callers pueden avisar/revertir
// si devuelve false, en vez de dejar el estado local desincronizado en silencio.
async function persistEmpleadoViaApi(empleadoId: string, data: Record<string, unknown>): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const res = await authFetch('/api/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authId: authUser?.id, empleadoId, data }),
    })
    if (!res.ok) console.error('[perfil] persistEmpleadoViaApi falló:', res.status)
    return res.ok
  } catch (err) {
    console.error('[perfil] persistEmpleadoViaApi error de red:', err)
    return false
  }
}


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
  const [synced, setSynced] = useState(false) // true cuando el primer sync de Supabase terminó

  // Espejos para leer la lista al día dentro de callbacks (ver useRefEspejo).
  const empleadosRef = useRefEspejo(empleados)
  const ticketsRef = useRefEspejo(tickets)
  const novedadesRef = useRefEspejo(novedades)
  const eventosRef = useRefEspejo(eventos)

  // ── Sync completo desde Supabase — todas las tablas ────────────────────────
  const syncFromSupabase = useCallback(async () => {
    if (!supabase) return
    try {
      const [usersRes, pendingRes, empRes, solRes, recRes, novRes, tickRes, notifRes, evtRes, firmasRes, regNovRes] = await Promise.all([
        supabase.from('fno_users').select('id, email, role, empleado_id'),
        supabase.from('fno_pending').select('*'),
        supabase.from('fno_empleados').select('id, nombre, apellido, dni, fecha_nacimiento, email, telefono, direccion, cuil, contacto_emergencia, sector, cargo, cargos_extra, fecha_ingreso, tipo_contrato, jornada, supervisor, estado, cbu, banco, desvinculacion, historial_desvinculaciones, foto, foto_cover'),
        supabase.from('fno_solicitudes').select('*'),
        supabase.from('fno_recibos').select('*'),
        supabase.from('fno_novedades').select('*'),
        supabase.from('fno_tickets').select('*'),
        supabase.from('fno_notifs').select('*').order('fecha', { ascending: false }).limit(200),
        supabase.from('fno_eventos').select('*'),
        supabase.from('fno_recibo_firmas').select('*'),
        supabase.from('fno_registros_novedad').select('*').order('creado_en', { ascending: false }),
      ])

      // Supabase es siempre la fuente de verdad — actualizar aunque el array esté vacío
      if (usersRes.data)
        setUsers(usersRes.data.map((u: Record<string, string>) => ({
          id: u.id, email: u.email,
          role: u.role as UserRole, empleadoId: u.empleado_id,
        })))

      if (pendingRes.data)
        setPending(pendingRes.data.map((p: Record<string, string>) => ({
          id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni,
          email: p.email, password: p.password, sector: p.sector,
          cargo: p.cargo, telefono: p.telefono ?? '', fechaSolicitud: p.fecha_solicitud,
        })))

      if (empRes.data)
        setEmpleados(empRes.data.map((r: Record<string, unknown>) => mapSupabaseToEmpleado(r)))

      if (solRes.data)
        setSolicitudes(solRes.data.map((r: Record<string, unknown>) => mapSupabaseToSolicitud(r)))

      if (recRes.data)
        setRecibos(recRes.data.map((r: Record<string, unknown>) => mapSupabaseToRecibo(r)))

      // Novedades: Supabase es la fuente de verdad (refleja también borrados → limpia seeds viejos)
      if (novRes.data)
        setNovedades(novRes.data.map((r: Record<string, unknown>) => mapSupabaseToNovedad(r)))

      if (tickRes.data)
        setTickets(tickRes.data.map((r: Record<string, unknown>) => mapSupabaseToTicket(r)))

      if (notifRes.data)
        setNotifications(notifRes.data.map((r: Record<string, unknown>) => mapSupabaseToNotif(r)))

      // Eventos: combinar los fijos del código (feriados/actos/jornadas) con los custom de la base
      if (evtRes.data) {
        const custom = evtRes.data
          .filter((r: Record<string, unknown>) => !EVENTOS_FIJOS_IDS.has(r.id as string))
          .map((r: Record<string, unknown>) => mapSupabaseToEvento(r))
        setEventos([...initial.eventos, ...custom].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      }

      if (firmasRes.data)
        setFirmas(firmasRes.data.map((r: Record<string, string>) => ({
          id: r.id, reciboId: r.recibo_id, empleadoId: r.empleado_id,
          firmadoEn: r.firmado_en, userAgent: r.user_agent ?? undefined,
        })))

      if (regNovRes.data)
        setRegistrosNovedad(regNovRes.data.map((r: Record<string, unknown>) => mapSupabaseToRegistroNovedad(r)))

    } catch (e) {
      console.error('[sync] Supabase sync error:', e)
    } finally {
      setSynced(true)
    }
  }, [])

  // Sync al montar + al volver a la pestaña + fallback lento cada 10 min.
  // OJO: NO bajar este intervalo — un polling de 30s descargaba toda la base
  // ~120 veces/hora por pestaña y reventó la cuota de egress de Supabase.
  // Los cambios en vivo ya llegan por Realtime; esto es solo red de seguridad.
  useEffect(() => {
    syncFromSupabase()
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncFromSupabase()
        // Disparar reconexión del canal Realtime si el WebSocket cayó en background
        // (frecuente en iOS Safari y PWAs). Se hace vía evento personalizado que
        // el efecto de Realtime escucha.
        window.dispatchEvent(new Event('fno:reconnect-realtime'))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') syncFromSupabase()
    }, 600_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [syncFromSupabase])

  // ── Supabase Realtime — solo se conecta cuando hay sesión activa ─────────────
  // Con RLS habilitado, suscribirse sin auth genera CHANNEL_ERROR.
  // Escuchamos onAuthStateChange y armamos/destruimos el canal según la sesión.
  useEffect(() => {
    if (!supabase) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    function setupChannel() {
      if (channel) supabase!.removeChannel(channel)
      channel = supabase!
        .channel('fno_realtime_auth')
        // Empleados
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_empleados' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setEmpleados(prev => prev.filter(e => e.id !== (o as { id: string }).id))
          else setEmpleados(prev => {
            // Preservar foto/fotoCover cacheadas si el evento Realtime no las trae
            const incoming = mapSupabaseToEmpleado(n as Record<string, unknown>)
            const existing = prev.find(e => e.id === incoming.id)
            if (existing && !incoming.foto && existing.foto) incoming.foto = existing.foto
            if (existing && !incoming.fotoCover && existing.fotoCover) incoming.fotoCover = existing.fotoCover
            return upsert(prev, incoming)
          })
        })
        // Usuarios
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_users' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setUsers(prev => prev.filter(u => u.id !== (o as { id: string }).id))
          else {
            const u = n as Record<string, string>
            setUsers(prev => upsert(prev, { id: u.id, email: u.email, role: u.role as UserRole, empleadoId: u.empleado_id }))
          }
        })
        // Pendientes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_pending' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setPending(prev => prev.filter(p => p.id !== (o as { id: string }).id))
          else {
            const p = n as Record<string, string>
            setPending(prev => upsert(prev, { id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni, email: p.email, password: p.password, sector: p.sector, cargo: p.cargo, telefono: p.telefono ?? '', fechaSolicitud: p.fecha_solicitud }))
          }
        })
        // Solicitudes
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_solicitudes' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setSolicitudes(prev => prev.filter(s => s.id !== (o as { id: string }).id))
          else setSolicitudes(prev => upsertHead(prev, mapSupabaseToSolicitud(n as Record<string, unknown>)))
        })
        // Recibos
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_recibos' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setRecibos(prev => prev.filter(r => r.id !== (o as { id: string }).id))
          else setRecibos(prev => upsertHead(prev, mapSupabaseToRecibo(n as Record<string, unknown>)))
        })
        // Novedades
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_novedades' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setNovedades(prev => prev.filter(x => x.id !== (o as { id: string }).id))
          else setNovedades(prev => upsertHead(prev, mapSupabaseToNovedad(n as Record<string, unknown>)))
        })
        // Tickets
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_tickets' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setTickets(prev => prev.filter(t => t.id !== (o as { id: string }).id))
          else setTickets(prev => upsertHead(prev, mapSupabaseToTicket(n as Record<string, unknown>)))
        })
        // Notificaciones
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_notifs' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setNotifications(prev => prev.filter(x => x.id !== (o as { id: string }).id))
          else setNotifications(prev => upsertHead(prev, mapSupabaseToNotif(n as Record<string, unknown>)))
        })
        // Eventos (custom; los fijos viven en el código)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_eventos' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setEventos(prev => prev.filter(e => e.id !== (o as { id: string }).id))
          else setEventos(prev => {
            const ev = mapSupabaseToEvento(n as Record<string, unknown>)
            const sinViejo = prev.filter(e => e.id !== ev.id)
            return [...sinViejo, ev].sort((a, b) => a.fecha.localeCompare(b.fecha))
          })
        })
        // Registros de novedad (solo admin)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fno_registros_novedad' }, ({ eventType, new: n, old: o }) => {
          if (eventType === 'DELETE') setRegistrosNovedad(prev => prev.filter(r => r.id !== (o as { id: string }).id))
          else setRegistrosNovedad(prev => upsertHead(prev, mapSupabaseToRegistroNovedad(n as Record<string, unknown>)))
        })
        .subscribe()
    }

    // Reconectar canal Realtime cuando el tab vuelve de background (WebSocket caído en móvil)
    const onReconnect = () => { if (channel) setupChannel() }
    window.addEventListener('fno:reconnect-realtime', onReconnect)

    // Solo conectar realtime cuando hay sesión activa
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      // TOKEN_REFRESHED ocurre ~cada hora y NO requiere rearmar el canal ni re-sincronizar.
      // Ignorarlo evita teardown/re-subscribe innecesarios y gaps de Realtime.
      if (_event === 'TOKEN_REFRESHED') return

      // Diferir con setTimeout(0): evita el deadlock del lock interno de Supabase
      // (sin esto, updateUser/signIn quedan colgados al rearmar realtime + queries).
      setTimeout(() => {
        if (session) {
          setupChannel()
          syncFromSupabase()
        } else {
          if (channel) { supabase!.removeChannel(channel); channel = null }
        }
      }, 0)
    })

    return () => {
      window.removeEventListener('fno:reconnect-realtime', onReconnect)
      authSub.unsubscribe()
      if (channel) supabase?.removeChannel(channel)
    }
  }, [syncFromSupabase])

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
  const addEmpleado = useCallback((e: Omit<Empleado, 'id'>): string => {
    const id = uid()
    const newEmp = { ...e, id }
    setEmpleados(prev => [...prev, newEmp])
    addNotification({ texto: `Nuevo empleado registrado: ${e.nombre} ${e.apellido}`, tipo: 'sistema', soloAdmin: true })
    if (supabase) supabase.from('fno_empleados').insert(mapEmpleadoToSupabase(newEmp)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_empleados:', error)
    })
    return id
  }, [addNotification])

  const updateEmpleado = useCallback((id: string, data: Partial<Empleado>) => {
    setEmpleados(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...data } : e)
      if (supabase) {
        const full = updated.find(e => e.id === id)
        if (full) supabase.from('fno_empleados').upsert(mapEmpleadoToSupabase(full)).then()
      }
      return updated
    })
  }, [])

  // Desactiva al empleado: guarda el registro de desvinculación + pone estado=inactivo
  const desactivarEmpleado = useCallback((id: string, info: DesvinculacionInfo) => {
    let prevEmp: Empleado | undefined
    setEmpleados(prev => {
      prevEmp = prev.find(e => e.id === id)
      return prev.map(e => e.id === id
        ? { ...e, estado: 'inactivo' as EmpleadoEstado, desvinculacion: info }
        : e
      )
    })
    // Persistir vía service role (RLS bloquea upserts client-side). Si falla, revertir.
    persistEmpleadoViaApi(id, { estado: 'inactivo', desvinculacion: info }).then(ok => {
      if (!ok && prevEmp) {
        setEmpleados(prev => prev.map(e => e.id === id ? prevEmp! : e))
        if (typeof window !== 'undefined') window.alert('No se pudo desactivar al empleado en el servidor. Intentá de nuevo.')
      }
    })
  }, [])

  // Reactiva al empleado: mueve la baja actual al historial (no se borra) + estado=activo
  const reactivarEmpleado = useCallback((id: string) => {
    let prevEmp: Empleado | undefined
    let full: Empleado | undefined
    setEmpleados(prev => {
      prevEmp = prev.find(e => e.id === id)
      const updated = prev.map(e => {
        if (e.id !== id) return e
        const historial = [
          ...(e.historialDesvinculaciones ?? []),
          ...(e.desvinculacion ? [e.desvinculacion] : []),  // preservar la baja actual
        ]
        return {
          ...e,
          estado: 'activo' as EmpleadoEstado,
          desvinculacion: undefined,
          historialDesvinculaciones: historial.length > 0 ? historial : undefined,
        }
      })
      full = updated.find(e => e.id === id)
      return updated
    })
    // Persistir vía service role (RLS bloquea upserts client-side). Si falla, revertir.
    persistEmpleadoViaApi(id, {
      estado: 'activo',
      desvinculacion: null,                              // limpiar baja activa
      historial_desvinculaciones: full?.historialDesvinculaciones ?? null,
    }).then(ok => {
      if (!ok && prevEmp) {
        setEmpleados(prev => prev.map(e => e.id === id ? prevEmp! : e))
        if (typeof window !== 'undefined') window.alert('No se pudo reactivar al empleado en el servidor. Intentá de nuevo.')
      }
    })
  }, [])

  // Solo actualiza el estado local. El borrado real (Auth + tablas) lo hace
  // /api/admin/delete-user de forma server-side y verificada.
  const deleteEmpleado = useCallback((id: string) => {
    setEmpleados(prev => prev.filter(e => e.id !== id))
    setUsers(prev => prev.filter(u => u.empleadoId !== id))
  }, [])

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
  const addPendingRegistration = useCallback((reg: Omit<PendingRegistration, 'id' | 'fechaSolicitud'>) => {
    const newReg: PendingRegistration = { ...reg, id: uid(), fechaSolicitud: hoyAR() }
    setPending(prev => [...prev, newReg])
    addNotification({ texto: `Nueva solicitud de acceso: ${reg.nombre} ${reg.apellido}`, tipo: 'registro', soloAdmin: true })
    if (supabase) {
      // password se guarda temporalmente hasta que el admin apruebe y se cree en Auth.
      // Se borra de fno_pending al aprobar (el hash queda solo en Supabase Auth).
      supabase.from('fno_pending').insert({
        id: newReg.id, nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni,
        email: reg.email, password: reg.password, sector: reg.sector,
        cargo: reg.cargo, telefono: reg.telefono || '', fecha_solicitud: newReg.fechaSolicitud,
      }).then(({ error }) => { if (error) console.error('[supabase] insert fno_pending:', error) })
    }
    sendEmail('new_registration', { nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni, email: reg.email, sector: reg.sector, cargo: reg.cargo, telefono: reg.telefono || '' })
  }, [addNotification])

  const approvePendingRegistration = useCallback(async (id: string) => {
    const reg = pendingRegistrations.find(p => p.id === id)
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
        body: JSON.stringify({ email: reg.email, password: reg.password, userId, empleadoId, role: 'employee', requesterId }),
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
  }, [pendingRegistrations, addNotification])

  const refreshPending = useCallback(async () => {
    if (!supabase) return
    try {
      const { data } = await supabase.from('fno_pending').select('*')
      if (data) {
        setPending(data.map((p: Record<string, string>) => ({
          id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni,
          email: p.email, password: p.password, sector: p.sector,
          cargo: p.cargo, telefono: p.telefono ?? '', fechaSolicitud: p.fecha_solicitud,
        })))
      }
    } catch (e) { console.error('[sync] refreshPending error:', e) }
  }, [])

  const rejectPendingRegistration = useCallback((id: string) => {
    const reg = pendingRegistrations.find(p => p.id === id)
    setPending(prev => prev.filter(p => p.id !== id))
    if (reg) {
      addNotification({ texto: `Solicitud de acceso rechazada: ${reg.nombre} ${reg.apellido}`, tipo: 'registro', soloAdmin: true })
      if (supabase) supabase.from('fno_pending').delete().eq('id', id).then()
      sendEmail('registration_rejected', { nombre: reg.nombre, email: reg.email })
    }
  }, [pendingRegistrations, addNotification])

  // ── Registros de Novedad (solo admin) ─────────────────────────────────────
  const addRegistroNovedad = useCallback(async (r: Omit<RegistroNovedad, 'id' | 'creadoEn'>): Promise<string> => {
    const nuevo: RegistroNovedad = { ...r, id: uid(), creadoEn: new Date().toISOString() }
    setRegistrosNovedad(prev => [nuevo, ...prev])
    if (supabase) {
      const { error } = await supabase.from('fno_registros_novedad').insert(mapRegistroNovedadToSupabase(nuevo))
      if (error) console.error('[supabase] insert fno_registros_novedad:', error.message)
    }
    return nuevo.id
  }, [])

  const updateRegistroNovedad = useCallback((id: string, data: Partial<Omit<RegistroNovedad, 'id' | 'creadoEn'>>) => {
    setRegistrosNovedad(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...data } : r)
      if (supabase) {
        const full = updated.find(r => r.id === id)
        if (full) supabase.from('fno_registros_novedad').upsert(mapRegistroNovedadToSupabase(full)).then()
      }
      return updated
    })
  }, [])

  const deleteRegistroNovedad = useCallback((id: string) => {
    setRegistrosNovedad(prev => prev.filter(r => r.id !== id))
    if (supabase) supabase.from('fno_registros_novedad').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[supabase] delete fno_registros_novedad:', error.message)
    })
  }, [])

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
