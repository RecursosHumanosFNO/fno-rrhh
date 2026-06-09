'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  Empleado, Solicitud, Recibo, Novedad, Ticket, User, Evento,
  AppNotification, PendingRegistration, TicketEstado, UserRole, EmpleadoEstado,
  SolicitudEstado, SolicitudTipo, NovedadCategoria, TicketTipo, ReciboFirma,
  DesvinculacionInfo,
} from '@/types'
import * as initial from '@/lib/mockData'
import { uid, SOLICITUD_TIPO_LABEL } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

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
  addNovedad: (n: Omit<Novedad, 'id'>, notifyEmail?: boolean) => void
  updateNovedad: (id: string, data: Partial<Omit<Novedad, 'id'>>) => void
  deleteNovedad: (id: string) => void
  // Eventos
  addEvento: (e: Omit<Evento, 'id'>) => void
  updateEvento: (id: string, data: Partial<Omit<Evento, 'id'>>) => void
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
  // Estado de sync
  synced: boolean
}

const DataContext = createContext<DataContextType | null>(null)

function sendEmail(type: string, data: Record<string, string>) {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => { /* email failure is non-fatal */ })
}

// ── Mappers Supabase ↔ Empleado ──────────────────────────────────────────────
function mapSupabaseToEmpleado(row: Record<string, unknown>): Empleado {
  const ce = (row.contacto_emergencia as Record<string, string>) ?? {}
  return {
    id: row.id as string,
    nombre: (row.nombre as string) ?? '',
    apellido: (row.apellido as string) ?? '',
    dni: (row.dni as string) ?? '',
    fechaNacimiento: (row.fecha_nacimiento as string) ?? '',
    email: (row.email as string) ?? '',
    telefono: (row.telefono as string) ?? '',
    direccion: (row.direccion as string) ?? '',
    foto: (row.foto as string) ?? '',
    fotoCover: (row.foto_cover as string) ?? '',
    cuil: (row.cuil as string) ?? '',
    contactoEmergencia: { nombre: ce.nombre ?? '', telefono: ce.telefono ?? '', relacion: ce.relacion ?? '' },
    sector: (row.sector as string) ?? '',
    cargo: (row.cargo as string) ?? '',
    cargosExtra: (row.cargos_extra as string[]) ?? [],
    fechaIngreso: (row.fecha_ingreso as string) ?? '',
    tipoContrato: (row.tipo_contrato as Empleado['tipoContrato']) ?? 'Contrato',
    jornada: (row.jornada as Empleado['jornada']) ?? 'Full Time',
    supervisor: (row.supervisor as string) ?? '',
    estado: ((row.estado as EmpleadoEstado) ?? 'activo'),
    diasVacaciones: (row.dias_vacaciones as number) ?? 14,
    diasVacacionesUsados: (row.dias_vacaciones_usados as number) ?? 0,
    cbu: (row.cbu as string) ?? '',
    banco: (row.banco as string) ?? '',
    desvinculacion: (row.desvinculacion as DesvinculacionInfo) ?? undefined,
    historialDesvinculaciones: (row.historial_desvinculaciones as DesvinculacionInfo[]) ?? undefined,
  }
}
function mapEmpleadoToSupabase(e: Empleado) {
  const row: Record<string, unknown> = {
    id: e.id, nombre: e.nombre, apellido: e.apellido, dni: e.dni,
    fecha_nacimiento: e.fechaNacimiento, email: e.email, telefono: e.telefono,
    direccion: e.direccion, foto: e.foto, foto_cover: e.fotoCover, cuil: e.cuil,
    contacto_emergencia: e.contactoEmergencia,
    sector: e.sector, cargo: e.cargo, cargos_extra: e.cargosExtra ?? [], fecha_ingreso: e.fechaIngreso,
    tipo_contrato: e.tipoContrato, jornada: e.jornada, supervisor: e.supervisor,
    estado: e.estado, dias_vacaciones: e.diasVacaciones,
    dias_vacaciones_usados: e.diasVacacionesUsados,
    cbu: e.cbu ?? '', banco: e.banco ?? '',
  }
  // Solo incluir desvinculacion si tiene valor para no romper inserts
  // cuando la columna aún no existe en la tabla de Supabase
  if (e.desvinculacion !== undefined) row.desvinculacion = e.desvinculacion
  if (e.historialDesvinculaciones !== undefined) row.historial_desvinculaciones = e.historialDesvinculaciones
  return row
}

// ── Mappers Supabase ↔ Solicitud ─────────────────────────────────────────────
function mapSupabaseToSolicitud(row: Record<string, unknown>): Solicitud {
  return {
    id: row.id as string,
    empleadoId: row.empleado_id as string,
    tipo: row.tipo as SolicitudTipo,
    fechaInicio: row.fecha_inicio as string,
    fechaFin: (row.fecha_fin as string) || undefined,
    descripcion: (row.descripcion as string) ?? '',
    estado: row.estado as SolicitudEstado,
    fechaCreacion: row.fecha_creacion as string,
    fechaResolucion: (row.fecha_resolucion as string) || undefined,
    comentarioAdmin: (row.comentario_admin as string) || undefined,
    adjunto: (row.adjunto as string) || undefined,
  }
}
function mapSolicitudToSupabase(s: Solicitud) {
  return {
    id: s.id, empleado_id: s.empleadoId, tipo: s.tipo,
    fecha_inicio: s.fechaInicio, fecha_fin: s.fechaFin ?? '',
    descripcion: s.descripcion, estado: s.estado,
    fecha_creacion: s.fechaCreacion, fecha_resolucion: s.fechaResolucion ?? '',
    comentario_admin: s.comentarioAdmin ?? '', adjunto: s.adjunto ?? '',
  }
}

// ── Mappers Supabase ↔ Recibo ─────────────────────────────────────────────────
function mapSupabaseToRecibo(row: Record<string, unknown>): Recibo {
  return {
    id: row.id as string, empleadoId: row.empleado_id as string,
    mes: row.mes as number, anio: row.anio as number,
    archivo: (row.archivo as string) ?? '', fechaSubida: row.fecha_subida as string,
    monto: row.monto as number,
    archivoUrl: (row.archivo_url as string) ?? undefined,
    concepto: (row.concepto as string) || undefined,
  }
}
function mapReciboToSupabase(r: Recibo) {
  return {
    id: r.id, empleado_id: r.empleadoId, mes: r.mes, anio: r.anio,
    archivo: r.archivo, fecha_subida: r.fechaSubida, monto: r.monto,
    archivo_url: r.archivoUrl ?? null,
    concepto: r.concepto ?? 'Recibo mensual',
  }
}

// ── Mappers Supabase ↔ Novedad ────────────────────────────────────────────────
function mapSupabaseToNovedad(row: Record<string, unknown>): Novedad {
  return {
    id: row.id as string, titulo: row.titulo as string,
    contenido: (row.contenido as string) ?? '',
    categoria: row.categoria as NovedadCategoria,
    fechaPublicacion: row.fecha_publicacion as string,
    autor: (row.autor as string) ?? '',
    importante: (row.importante as boolean) ?? false,
    imagen: (row.imagen as string) || undefined,
    adjuntoUrl: (row.adjunto_url as string) || undefined,
    adjuntoNombre: (row.adjunto_nombre as string) || undefined,
  }
}
function mapNovedadToSupabase(n: Novedad) {
  return {
    id: n.id, titulo: n.titulo, contenido: n.contenido,
    categoria: n.categoria, fecha_publicacion: n.fechaPublicacion,
    autor: n.autor, importante: n.importante, imagen: n.imagen ?? '',
    adjunto_url: n.adjuntoUrl ?? null, adjunto_nombre: n.adjuntoNombre ?? null,
  }
}

// ── Mappers Supabase ↔ Ticket ─────────────────────────────────────────────────
function mapSupabaseToTicket(row: Record<string, unknown>): Ticket {
  return {
    id: row.id as string, empleadoId: row.empleado_id as string,
    tipo: row.tipo as TicketTipo, asunto: row.asunto as string,
    descripcion: (row.descripcion as string) ?? '',
    estado: row.estado as TicketEstado,
    fechaCreacion: row.fecha_creacion as string,
    fechaActualizacion: row.fecha_actualizacion as string,
    respuesta: (row.respuesta as string) || undefined,
  }
}
function mapTicketToSupabase(t: Ticket) {
  return {
    id: t.id, empleado_id: t.empleadoId, tipo: t.tipo, asunto: t.asunto,
    descripcion: t.descripcion, estado: t.estado,
    fecha_creacion: t.fechaCreacion, fecha_actualizacion: t.fechaActualizacion,
    respuesta: t.respuesta ?? '',
  }
}

// ── Mappers Supabase ↔ AppNotification ────────────────────────────────────────
function mapSupabaseToNotif(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string, texto: row.texto as string,
    leida: (row.leida as boolean) ?? false,
    fecha: row.fecha as string,
    tipo: row.tipo as AppNotification['tipo'],
    empleadoId: (row.empleado_id as string) || undefined,
  }
}
function mapNotifToSupabase(n: AppNotification) {
  return {
    id: n.id, texto: n.texto, leida: n.leida, fecha: n.fecha,
    tipo: n.tipo, empleado_id: n.empleadoId ?? '',
  }
}

// ── Mappers Supabase ↔ Evento ─────────────────────────────────────────────────
function mapSupabaseToEvento(row: Record<string, unknown>): Evento {
  return {
    id: row.id as string,
    titulo: row.titulo as string,
    fecha: row.fecha as string,
    tipo: row.tipo as Evento['tipo'],
    descripcion: (row.descripcion as string) || undefined,
    empleadoId: (row.empleado_id as string) || undefined,
    imagen: (row.imagen as string) || undefined,
    adjuntoUrl: (row.adjunto_url as string) || undefined,
    adjuntoNombre: (row.adjunto_nombre as string) || undefined,
  }
}
function mapEventoToSupabase(e: Evento) {
  return {
    id: e.id, titulo: e.titulo, fecha: e.fecha, tipo: e.tipo,
    descripcion: e.descripcion ?? '', empleado_id: e.empleadoId ?? null,
    imagen: e.imagen ?? null,
    adjunto_url: e.adjuntoUrl ?? null, adjunto_nombre: e.adjuntoNombre ?? null,
  }
}

// IDs de los eventos institucionales fijos (feriados, actos, jornadas) que viven
// en el código (mockData) y NO en la base. Sirve para no duplicarlos al sincronizar.
const EVENTOS_FIJOS_IDS = new Set(initial.eventos.map(e => e.id))

// ── Realtime upsert helpers ────────────────────────────────────────────────────
function upsert<T extends { id: string }>(prev: T[], item: T): T[] {
  const i = prev.findIndex(x => x.id === item.id)
  return i >= 0 ? prev.map(x => x.id === item.id ? item : x) : [...prev, item]
}
function upsertHead<T extends { id: string }>(prev: T[], item: T): T[] {
  const i = prev.findIndex(x => x.id === item.id)
  return i >= 0 ? prev.map(x => x.id === item.id ? item : x) : [item, ...prev]
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
  const [synced, setSynced] = useState(false) // true cuando el primer sync de Supabase terminó

  // ── Sync completo desde Supabase — todas las tablas ────────────────────────
  const syncFromSupabase = useCallback(async () => {
    if (!supabase) return
    try {
      const [usersRes, pendingRes, empRes, solRes, recRes, novRes, tickRes, notifRes, evtRes, firmasRes] = await Promise.all([
        supabase.from('fno_users').select('id, email, role, empleado_id'),
        supabase.from('fno_pending').select('*'),
        supabase.from('fno_empleados').select('id, nombre, apellido, dni, fecha_nacimiento, email, telefono, direccion, cuil, contacto_emergencia, sector, cargo, cargos_extra, fecha_ingreso, tipo_contrato, jornada, supervisor, estado, dias_vacaciones, dias_vacaciones_usados, cbu, banco, desvinculacion, historial_desvinculaciones'),
        supabase.from('fno_solicitudes').select('*'),
        supabase.from('fno_recibos').select('*'),
        supabase.from('fno_novedades').select('*'),
        supabase.from('fno_tickets').select('*'),
        supabase.from('fno_notifs').select('*').order('fecha', { ascending: false }),
        supabase.from('fno_eventos').select('*'),
        supabase.from('fno_recibo_firmas').select('*'),
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

    } catch (e) {
      console.error('[sync] Supabase sync error:', e)
    } finally {
      setSynced(true)
    }
  }, [])

  // Sync al montar + polling cada 30s como fallback
  useEffect(() => {
    syncFromSupabase()
    const interval = setInterval(syncFromSupabase, 30_000)
    return () => clearInterval(interval)
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
        .subscribe()
    }

    // Solo conectar realtime cuando hay sesión activa
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      authSub.unsubscribe()
      if (channel) supabase?.removeChannel(channel)
    }
  }, [syncFromSupabase])

  // Sync entre pestañas lo maneja Supabase Realtime — no necesitamos storage events

  // ── Notificaciones ─────────────────────────────────────────────────────────
  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => {
    const notif: AppNotification = { ...n, id: uid(), fecha: new Date().toISOString().slice(0, 10), leida: false }
    setNotifications(prev => [notif, ...prev])
    if (supabase) supabase.from('fno_notifs').insert(mapNotifToSupabase(notif)).then()
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
    setEmpleados(prev => {
      const updated = prev.map(e => e.id === id
        ? { ...e, estado: 'inactivo' as EmpleadoEstado, desvinculacion: info }
        : e
      )
      if (supabase) {
        const full = updated.find(e => e.id === id)
        if (full) supabase.from('fno_empleados').upsert(mapEmpleadoToSupabase(full)).then()
      }
      return updated
    })
  }, [])

  // Reactiva al empleado: mueve la baja actual al historial (no se borra) + estado=activo
  const reactivarEmpleado = useCallback((id: string) => {
    setEmpleados(prev => {
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
      if (supabase) {
        const full = updated.find(e => e.id === id)
        if (full) {
          supabase.from('fno_empleados')
            .upsert({
              ...mapEmpleadoToSupabase(full),
              desvinculacion: null,                          // limpiar baja activa
              historial_desvinculaciones: full.historialDesvinculaciones ?? null,
            })
            .then()
        }
      }
      return updated
    })
  }, [])

  // Solo actualiza el estado local. El borrado real (Auth + tablas) lo hace
  // /api/admin/delete-user de forma server-side y verificada.
  const deleteEmpleado = useCallback((id: string) => {
    setEmpleados(prev => prev.filter(e => e.id !== id))
    setUsers(prev => prev.filter(u => u.empleadoId !== id))
  }, [])

  // ── Solicitudes ────────────────────────────────────────────────────────────
  const addSolicitud = useCallback((s: Omit<Solicitud, 'id' | 'fechaCreacion' | 'estado'>) => {
    const nueva: Solicitud = { ...s, id: uid(), estado: 'pendiente', fechaCreacion: new Date().toISOString().slice(0, 10) }
    const tipoLabel = SOLICITUD_TIPO_LABEL[s.tipo] ?? s.tipo
    setSolicitudes(prev => [nueva, ...prev])
    // Confirmación al empleado
    addNotification({ texto: `Tu solicitud de ${tipoLabel} fue enviada y está pendiente de revisión`, tipo: 'solicitud', empleadoId: s.empleadoId })
    // Alerta al admin + email
    setEmpleados(prev => {
      const emp = prev.find(e => e.id === s.empleadoId)
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
      return prev
    })
    if (supabase) supabase.from('fno_solicitudes').insert(mapSolicitudToSupabase(nueva)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_solicitudes:', error)
    })
  }, [addNotification])

  const approveSolicitud = useCallback((id: string, comment: string) => {
    const fechaRes = new Date().toISOString().slice(0, 10)
    setSolicitudes(prev => prev.map(s => s.id === id
      ? { ...s, estado: 'aprobado', fechaResolucion: fechaRes, comentarioAdmin: comment }
      : s
    ))
    if (supabase) supabase.from('fno_solicitudes').update({ estado: 'aprobado', fecha_resolucion: fechaRes, comentario_admin: comment }).eq('id', id).then()
    const sol = solicitudes.find(s => s.id === id)
    if (sol) {
      // Notificación al empleado
      addNotification({ texto: 'Tu solicitud fue aprobada ✓', tipo: 'solicitud', empleadoId: sol.empleadoId })
      setEmpleados(prev => {
        const emp = prev.find(e => e.id === sol.empleadoId)
        const nombreEmp = emp ? `${emp.nombre} ${emp.apellido}` : 'el empleado'
        // Confirmación para el admin
        addNotification({ texto: `Solicitud de ${nombreEmp} aprobada y notificada`, tipo: 'solicitud', soloAdmin: true })
        if (emp?.email) sendEmail('solicitud_resuelta', { email: emp.email, nombre: nombreEmp, tipo: SOLICITUD_TIPO_LABEL[sol.tipo as keyof typeof SOLICITUD_TIPO_LABEL] ?? sol.tipo, estado: 'aprobado', comentario: comment })
        return prev
      })
    }
  }, [solicitudes, addNotification])

  const editSolicitud = useCallback((id: string, estado: 'aprobado' | 'rechazado', comment: string) => {
    const fechaRes = new Date().toISOString().slice(0, 10)
    setSolicitudes(prev => prev.map(s => s.id === id
      ? { ...s, estado, fechaResolucion: fechaRes, comentarioAdmin: comment }
      : s
    ))
    if (supabase) supabase.from('fno_solicitudes').update({ estado, fecha_resolucion: fechaRes, comentario_admin: comment }).eq('id', id).then()
    const sol = solicitudes.find(s => s.id === id)
    if (sol) {
      const textoEmp = estado === 'aprobado' ? 'Tu solicitud fue actualizada: aprobada ✓' : 'Tu solicitud fue actualizada: rechazada'
      addNotification({ texto: textoEmp, tipo: 'solicitud', empleadoId: sol.empleadoId })
      setEmpleados(prev => {
        const emp = prev.find(e => e.id === sol.empleadoId)
        const nombreEmp = emp ? `${emp.nombre} ${emp.apellido}` : 'el empleado'
        if (emp?.email) sendEmail('solicitud_resuelta', { email: emp.email, nombre: nombreEmp, tipo: SOLICITUD_TIPO_LABEL[sol.tipo as keyof typeof SOLICITUD_TIPO_LABEL] ?? sol.tipo, estado, comentario: comment })
        return prev
      })
    }
  }, [solicitudes, addNotification])

  const cancelSolicitud = useCallback((id: string) => {
    setSolicitudes(prev => prev.filter(s => s.id !== id))
    if (supabase) supabase.from('fno_solicitudes').delete().eq('id', id).then()
  }, [])

  const rejectSolicitud = useCallback((id: string, comment: string) => {
    const fechaRes = new Date().toISOString().slice(0, 10)
    setSolicitudes(prev => prev.map(s => s.id === id
      ? { ...s, estado: 'rechazado', fechaResolucion: fechaRes, comentarioAdmin: comment }
      : s
    ))
    if (supabase) supabase.from('fno_solicitudes').update({ estado: 'rechazado', fecha_resolucion: fechaRes, comentario_admin: comment }).eq('id', id).then()
    const sol = solicitudes.find(s => s.id === id)
    if (sol) {
      // Notificación al empleado
      addNotification({ texto: 'Tu solicitud fue rechazada', tipo: 'solicitud', empleadoId: sol.empleadoId })
      setEmpleados(prev => {
        const emp = prev.find(e => e.id === sol.empleadoId)
        const nombreEmp = emp ? `${emp.nombre} ${emp.apellido}` : 'el empleado'
        // Confirmación para el admin
        addNotification({ texto: `Solicitud de ${nombreEmp} rechazada y notificada`, tipo: 'solicitud', soloAdmin: true })
        if (emp?.email) sendEmail('solicitud_resuelta', { email: emp.email, nombre: nombreEmp, tipo: SOLICITUD_TIPO_LABEL[sol.tipo as keyof typeof SOLICITUD_TIPO_LABEL] ?? sol.tipo, estado: 'rechazado', comentario: comment })
        return prev
      })
    }
  }, [solicitudes, addNotification])

  // ── Novedades ──────────────────────────────────────────────────────────────
  const addNovedad = useCallback((n: Omit<Novedad, 'id'>, notifyEmail = false) => {
    const nueva = { ...n, id: uid() }
    setNovedades(prev => [nueva, ...prev])
    addNotification({ texto: `Nueva novedad publicada: ${n.titulo}`, tipo: 'novedad' })
    if (supabase) supabase.from('fno_novedades').insert(mapNovedadToSupabase(nueva)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_novedades:', error)
    })
    if (notifyEmail) {
      sendEmail('novedad_publicada', { titulo: n.titulo, contenido: n.contenido, autor: n.autor, imagen: n.imagen ?? '' })
    }
  }, [addNotification])

  const updateNovedad = useCallback((id: string, data: Partial<Omit<Novedad, 'id'>>) => {
    setNovedades(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, ...data } : n)
      if (supabase) {
        const full = updated.find(n => n.id === id)
        if (full) supabase.from('fno_novedades').upsert(mapNovedadToSupabase(full)).then()
      }
      return updated
    })
  }, [])

  const deleteNovedad = useCallback((id: string) => {
    setNovedades(prev => prev.filter(n => n.id !== id))
    if (supabase) supabase.from('fno_novedades').delete().eq('id', id).then()
  }, [])

  // ── Eventos (CRUD) ─────────────────────────────────────────────────────────
  const addEvento = useCallback((e: Omit<Evento, 'id'>) => {
    const nuevo: Evento = { ...e, id: uid() }
    setEventos(prev => [...prev, nuevo].sort((a, b) => a.fecha.localeCompare(b.fecha)))
    if (supabase) supabase.from('fno_eventos').insert(mapEventoToSupabase(nuevo)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_eventos:', error)
    })
  }, [])

  const updateEvento = useCallback((id: string, data: Partial<Omit<Evento, 'id'>>) => {
    setEventos(prev => {
      const updated = prev
        .map(e => e.id === id ? { ...e, ...data } : e)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
      // Solo persisten los eventos custom (los fijos viven en el código)
      if (supabase && !EVENTOS_FIJOS_IDS.has(id)) {
        const full = updated.find(e => e.id === id)
        if (full) supabase.from('fno_eventos').upsert(mapEventoToSupabase(full)).then()
      }
      return updated
    })
  }, [])

  const deleteEvento = useCallback((id: string) => {
    setEventos(prev => prev.filter(e => e.id !== id))
    if (supabase && !EVENTOS_FIJOS_IDS.has(id)) {
      supabase.from('fno_eventos').delete().eq('id', id).then()
    }
  }, [])

  // ── Recibos ────────────────────────────────────────────────────────────────
  const addRecibo = useCallback((r: Omit<Recibo, 'id'>) => {
    const nuevo = { ...r, id: uid() }
    setRecibos(prev => [nuevo, ...prev])
    addNotification({ texto: `Nuevo recibo de sueldo disponible — verificá tu sección de recibos`, tipo: 'recibo', empleadoId: r.empleadoId, soloEmpleado: true })
    if (supabase) supabase.from('fno_recibos').insert(mapReciboToSupabase(nuevo)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_recibos:', error)
    })
    // Notificar por email al empleado
    setEmpleados(prev => {
      const emp = prev.find(e => e.id === r.empleadoId)
      if (emp?.email) {
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        sendEmail('recibo_disponible', {
          email: emp.email,
          nombre: `${emp.nombre} ${emp.apellido}`,
          periodo: `${meses[r.mes - 1]} ${r.anio}`,
        })
      }
      return prev
    })
  }, [addNotification])

  const deleteRecibo = useCallback((id: string) => {
    setRecibos(prev => prev.filter(r => r.id !== id))
    if (supabase) supabase.from('fno_recibos').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[supabase] delete fno_recibos:', error)
    })
  }, [])

  const firmarRecibo = useCallback(async (reciboId: string, empleadoId: string): Promise<boolean> => {
    if (!supabase) return false
    const firma: ReciboFirma = {
      id: uid(),
      reciboId,
      empleadoId,
      firmadoEn: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }
    const { error } = await supabase.from('fno_recibo_firmas').insert({
      id: firma.id,
      recibo_id: firma.reciboId,
      empleado_id: firma.empleadoId,
      firmado_en: firma.firmadoEn,
      user_agent: firma.userAgent ?? null,
    })
    if (error) {
      console.error('[firmarRecibo] error:', error.message)
      return false
    }
    setFirmas(prev => [...prev, firma])
    return true
  }, [])

  // ── Tickets ────────────────────────────────────────────────────────────────
  const addTicket = useCallback((t: Omit<Ticket, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'estado'>) => {
    const hoy = new Date().toISOString().slice(0, 10)
    const nuevo: Ticket = { ...t, id: uid(), estado: 'abierto', fechaCreacion: hoy, fechaActualizacion: hoy }
    setTickets(prev => [nuevo, ...prev])
    addNotification({ texto: `Nuevo ticket de RRHH: ${t.asunto}`, tipo: 'ticket', empleadoId: t.empleadoId })
    if (supabase) supabase.from('fno_tickets').insert(mapTicketToSupabase(nuevo)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_tickets:', error)
    })
  }, [addNotification])

  const respondTicket = useCallback((id: string, respuesta: string, estado: TicketEstado) => {
    const hoy = new Date().toISOString().slice(0, 10)
    setTickets(prev => {
      const ticket = prev.find(t => t.id === id)
      if (ticket) {
        // Notificar por email al empleado
        setEmpleados(emps => {
          const emp = emps.find(e => e.id === ticket.empleadoId)
          if (emp?.email) {
            sendEmail('ticket_respondido', {
              email: emp.email,
              nombre: `${emp.nombre} ${emp.apellido}`,
              asunto: ticket.asunto,
              respuesta,
              estado,
            })
          }
          return emps
        })
        addNotification({ texto: `Tu pedido "${ticket.asunto}" recibió una respuesta de RRHH`, tipo: 'ticket', empleadoId: ticket.empleadoId })
      }
      return prev.map(t => t.id === id ? { ...t, respuesta, estado, fechaActualizacion: hoy } : t)
    })
    if (supabase) supabase.from('fno_tickets').update({ respuesta, estado, fecha_actualizacion: hoy }).eq('id', id).then()
  }, [addNotification])

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
    const newReg: PendingRegistration = { ...reg, id: uid(), fechaSolicitud: new Date().toISOString().slice(0, 10) }
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
    const hoy = new Date().toISOString().slice(0, 10)
    const nuevoEmpleado: Empleado = {
      id: empleadoId, nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni,
      fechaNacimiento: '', email: reg.email, telefono: reg.telefono,
      direccion: '', foto: '', fotoCover: '', cuil: '',
      contactoEmergencia: { nombre: '', telefono: '', relacion: '' },
      sector: reg.sector, cargo: reg.cargo, cargosExtra: [], fechaIngreso: hoy,
      tipoContrato: 'Contrato', jornada: 'Full Time', supervisor: '',
      estado: 'activo', diasVacaciones: 14, diasVacacionesUsados: 0,
    }
    const userId = uid()
    const nuevoUser: User = { id: userId, email: reg.email, role: 'employee', empleadoId }
    setEmpleados(prev => [...prev, nuevoEmpleado])
    setUsers(prev => [...prev, nuevoUser])
    setPending(prev => prev.filter(p => p.id !== id))
    addNotification({ texto: `Acceso aprobado para ${reg.nombre} ${reg.apellido}`, tipo: 'registro', soloAdmin: true })
    if (supabase) {
      supabase.from('fno_empleados').insert(mapEmpleadoToSupabase(nuevoEmpleado)).then(({ error }) => {
        if (error) console.error('[supabase] insert fno_empleados (approve):', error)
      })
      supabase.from('fno_pending').delete().eq('id', id).then()
      // Crear usuario en Supabase Auth + fno_users via ruta server-side (contraseña encriptada)
      // Obtener el auth_id del admin desde la sesión activa de Supabase
      const { data: { session } } = await supabase.auth.getSession()
      const requesterId = session?.user?.id ?? ''
      fetch('/api/admin/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reg.email, password: reg.password, userId, empleadoId, role: 'employee', requesterId }),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          console.error('[auth] create-auth-user falló:', r.status, err)
        }
      }).catch(err => console.error('[auth] create-auth-user error de red:', err))
    }
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
      pendingRegistrations, notifications,
      addEmpleado, updateEmpleado, deleteEmpleado, desactivarEmpleado, reactivarEmpleado,
      addSolicitud, approveSolicitud, rejectSolicitud, editSolicitud, cancelSolicitud,
      addNovedad, updateNovedad, deleteNovedad,
      addEvento, updateEvento, deleteEvento,
      addRecibo, deleteRecibo, firmas, firmarRecibo,
      addTicket, respondTicket,
      setUserRole, getUserByEmail, getPendingByEmail,
      addPendingRegistration, approvePendingRegistration, rejectPendingRegistration, refreshPending,
      markNotificationRead, markAllRead, addNotification, synced,
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
