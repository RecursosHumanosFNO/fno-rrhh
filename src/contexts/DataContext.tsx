'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  Empleado, Solicitud, Recibo, Novedad, Ticket, User,
  AppNotification, PendingRegistration, TicketEstado, UserRole, EmpleadoEstado,
} from '@/types'
import * as initial from '@/lib/mockData'
import { uid } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { SOLICITUD_TIPO_LABEL } from '@/lib/utils'

interface DataContextType {
  empleados: Empleado[]
  solicitudes: Solicitud[]
  recibos: Recibo[]
  novedades: Novedad[]
  tickets: Ticket[]
  users: User[]
  pendingRegistrations: PendingRegistration[]
  notifications: AppNotification[]
  // Empleados
  addEmpleado: (e: Omit<Empleado, 'id'>) => string
  updateEmpleado: (id: string, data: Partial<Empleado>) => void
  deleteEmpleado: (id: string) => void
  // Solicitudes
  addSolicitud: (s: Omit<Solicitud, 'id' | 'fechaCreacion' | 'estado'>) => void
  approveSolicitud: (id: string, comment: string) => void
  rejectSolicitud: (id: string, comment: string) => void
  // Novedades
  addNovedad: (n: Omit<Novedad, 'id'>) => void
  deleteNovedad: (id: string) => void
  // Recibos
  addRecibo: (r: Omit<Recibo, 'id'>) => void
  // Tickets
  addTicket: (t: Omit<Ticket, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'estado'>) => void
  respondTicket: (id: string, respuesta: string, estado: TicketEstado) => void
  // Usuarios / Registro
  addUser: (u: User) => void
  updateUserPassword: (userId: string, newPassword: string) => void
  addPendingRegistration: (reg: Omit<PendingRegistration, 'id' | 'fechaSolicitud'>) => void
  approvePendingRegistration: (id: string) => void
  rejectPendingRegistration: (id: string) => void
  getUserByEmail: (email: string) => User | undefined
  getPendingByEmail: (email: string) => PendingRegistration | undefined
  refreshPending: () => Promise<void>
  // Notificaciones
  markNotificationRead: (id: string) => void
  markAllRead: () => void
  addNotification: (n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void
}

const DataContext = createContext<DataContextType | null>(null)

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : fallback
  } catch { return fallback }
}

// ── Helpers Supabase ↔ Empleado ───────────────────────────────────────────
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
    contactoEmergencia: {
      nombre: ce.nombre ?? '',
      telefono: ce.telefono ?? '',
      relacion: ce.relacion ?? '',
    },
    sector: (row.sector as string) ?? '',
    cargo: (row.cargo as string) ?? '',
    fechaIngreso: (row.fecha_ingreso as string) ?? '',
    tipoContrato: (row.tipo_contrato as Empleado['tipoContrato']) ?? 'Contrato',
    jornada: (row.jornada as Empleado['jornada']) ?? 'Full Time',
    supervisor: (row.supervisor as string) ?? '',
    estado: ((row.estado as EmpleadoEstado) ?? 'activo'),
    diasVacaciones: (row.dias_vacaciones as number) ?? 14,
    diasVacacionesUsados: (row.dias_vacaciones_usados as number) ?? 0,
    cbu: (row.cbu as string) ?? '',
    banco: (row.banco as string) ?? '',
  }
}

function mapEmpleadoToSupabase(e: Empleado) {
  return {
    id: e.id,
    nombre: e.nombre,
    apellido: e.apellido,
    dni: e.dni,
    fecha_nacimiento: e.fechaNacimiento,
    email: e.email,
    telefono: e.telefono,
    direccion: e.direccion,
    foto: e.foto,
    foto_cover: e.fotoCover,
    cuil: e.cuil,
    contacto_emergencia: e.contactoEmergencia,
    sector: e.sector,
    cargo: e.cargo,
    fecha_ingreso: e.fechaIngreso,
    tipo_contrato: e.tipoContrato,
    jornada: e.jornada,
    supervisor: e.supervisor,
    estado: e.estado,
    dias_vacaciones: e.diasVacaciones,
    dias_vacaciones_usados: e.diasVacacionesUsados,
    cbu: e.cbu ?? '',
    banco: e.banco ?? '',
  }
}

// Fire-and-forget email notification — never blocks the UI
function sendEmail(type: string, data: Record<string, string>) {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => { /* email failure is non-fatal */ })
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [empleados, setEmpleados] = useState<Empleado[]>(() => load('fno_empleados', initial.empleados))
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(() => load('fno_solicitudes', initial.solicitudes))
  const [recibos, setRecibos] = useState<Recibo[]>(() => load('fno_recibos', initial.recibos))
  const [novedades, setNovedades] = useState<Novedad[]>(() => load('fno_novedades', initial.novedades))
  const [tickets, setTickets] = useState<Ticket[]>(() => load('fno_tickets', initial.tickets))
  const [users, setUsers] = useState<User[]>(() => load('fno_users', initial.users))
  const [pendingRegistrations, setPending] = useState<PendingRegistration[]>(() => load('fno_pending', []))
  const [notifications, setNotifications] = useState<AppNotification[]>(() => load('fno_notifs', [
    { id: 'sys1', texto: 'Bienvenido al Portal de RRHH de Fundación Neuquén Oeste', leida: false, fecha: '2026-05-26', tipo: 'sistema' },
  ]))

  // ── Persistencia localStorage ──────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('fno_empleados', JSON.stringify(empleados)) }, [empleados])
  useEffect(() => { localStorage.setItem('fno_solicitudes', JSON.stringify(solicitudes)) }, [solicitudes])
  useEffect(() => { localStorage.setItem('fno_recibos', JSON.stringify(recibos)) }, [recibos])
  useEffect(() => { localStorage.setItem('fno_novedades', JSON.stringify(novedades)) }, [novedades])
  useEffect(() => { localStorage.setItem('fno_tickets', JSON.stringify(tickets)) }, [tickets])
  useEffect(() => { localStorage.setItem('fno_users', JSON.stringify(users)) }, [users])
  useEffect(() => { localStorage.setItem('fno_pending', JSON.stringify(pendingRegistrations)) }, [pendingRegistrations])
  useEffect(() => { localStorage.setItem('fno_notifs', JSON.stringify(notifications)) }, [notifications])

  // ── Sincronización con Supabase ────────────────────────────────────────────
  const syncFromSupabase = useCallback(async () => {
    if (!supabase) return
    try {
      const [usersRes, pendingRes, empleadosRes] = await Promise.all([
        supabase.from('fno_users').select('*'),
        supabase.from('fno_pending').select('*'),
        supabase.from('fno_empleados').select('*'),
      ])
      if (usersRes.data && usersRes.data.length > 0) {
        const mapped: User[] = usersRes.data.map((u: Record<string, string>) => ({
          id: u.id, email: u.email, password: u.password,
          role: u.role as UserRole, empleadoId: u.empleado_id,
        }))
        setUsers(mapped)
      }
      if (pendingRes.data) {
        const mapped: PendingRegistration[] = pendingRes.data.map((p: Record<string, string>) => ({
          id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni,
          email: p.email, password: p.password, sector: p.sector,
          cargo: p.cargo, telefono: p.telefono ?? '',
          fechaSolicitud: p.fecha_solicitud,
        }))
        setPending(mapped)
      }
      // Si Supabase tiene empleados, es la fuente de verdad
      if (empleadosRes.data && empleadosRes.data.length > 0) {
        setEmpleados(empleadosRes.data.map((row: Record<string, unknown>) => mapSupabaseToEmpleado(row)))
      }
    } catch (e) {
      console.error('Supabase sync error:', e)
    }
  }, [])

  // Sync al montar y cada 30s (cross-device)
  useEffect(() => {
    syncFromSupabase()
    const interval = setInterval(syncFromSupabase, 30_000)
    return () => clearInterval(interval)
  }, [syncFromSupabase])

  // Sync entre pestañas del mismo navegador via storage event
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      try {
        if (e.key === 'fno_users' && e.newValue) setUsers(JSON.parse(e.newValue))
        if (e.key === 'fno_pending' && e.newValue) setPending(JSON.parse(e.newValue))
        if (e.key === 'fno_solicitudes' && e.newValue) setSolicitudes(JSON.parse(e.newValue))
        if (e.key === 'fno_empleados' && e.newValue) setEmpleados(JSON.parse(e.newValue))
        if (e.key === 'fno_novedades' && e.newValue) setNovedades(JSON.parse(e.newValue))
        if (e.key === 'fno_recibos' && e.newValue) setRecibos(JSON.parse(e.newValue))
        if (e.key === 'fno_tickets' && e.newValue) setTickets(JSON.parse(e.newValue))
        if (e.key === 'fno_notifs' && e.newValue) setNotifications(JSON.parse(e.newValue))
      } catch { /* ignore parse errors */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => {
    setNotifications(prev => [{ ...n, id: uid(), fecha: new Date().toISOString().slice(0, 10), leida: false }, ...prev])
  }, [])

  // ── Empleados ──────────────────────────────────────────────────────────────
  const addEmpleado = useCallback((e: Omit<Empleado, 'id'>): string => {
    const id = uid()
    const newEmp = { ...e, id }
    setEmpleados(prev => [...prev, newEmp])
    addNotification({ texto: `Nuevo empleado registrado: ${e.nombre} ${e.apellido}`, tipo: 'sistema' })
    if (supabase) {
      supabase.from('fno_empleados').insert(mapEmpleadoToSupabase(newEmp)).then(({ error }) => {
        if (error) console.error('Supabase insert fno_empleados error:', error)
      })
    }
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

  const deleteEmpleado = useCallback((id: string) => {
    setEmpleados(prev => prev.filter(e => e.id !== id))
    setUsers(prev => prev.filter(u => u.empleadoId !== id))
    if (supabase) {
      supabase.from('fno_empleados').delete().eq('id', id).then()
      supabase.from('fno_users').delete().eq('empleado_id', id).then()
    }
  }, [])

  // ── Solicitudes ────────────────────────────────────────────────────────────
  const addSolicitud = useCallback((s: Omit<Solicitud, 'id' | 'fechaCreacion' | 'estado'>) => {
    const nueva: Solicitud = { ...s, id: uid(), estado: 'pendiente', fechaCreacion: new Date().toISOString().slice(0, 10) }
    setSolicitudes(prev => [nueva, ...prev])
    addNotification({ texto: `Nueva solicitud de ${s.tipo.replace('_', ' ')}: requiere revisión`, tipo: 'solicitud', empleadoId: s.empleadoId })
  }, [addNotification])

  // Llama a email cuando el admin aprueba/rechaza una solicitud
  const approveSolicitud = useCallback((id: string, comment: string) => {
    setSolicitudes(prev => prev.map(s => s.id === id
      ? { ...s, estado: 'aprobado', fechaResolucion: new Date().toISOString().slice(0, 10), comentarioAdmin: comment }
      : s
    ))
    const sol = solicitudes.find(s => s.id === id)
    if (sol) {
      addNotification({ texto: 'Tu solicitud fue aprobada', tipo: 'solicitud', empleadoId: sol.empleadoId })
      // Buscar email del empleado para notificarlo
      setEmpleados(prev => {
        const emp = prev.find(e => e.id === sol.empleadoId)
        if (emp?.email) {
          sendEmail('solicitud_resuelta', {
            email: emp.email,
            nombre: `${emp.nombre} ${emp.apellido}`,
            tipo: SOLICITUD_TIPO_LABEL[sol.tipo as keyof typeof SOLICITUD_TIPO_LABEL] ?? sol.tipo,
            estado: 'aprobado',
            comentario: comment,
          })
        }
        return prev
      })
    }
  }, [solicitudes, addNotification])

  const rejectSolicitud = useCallback((id: string, comment: string) => {
    setSolicitudes(prev => prev.map(s => s.id === id
      ? { ...s, estado: 'rechazado', fechaResolucion: new Date().toISOString().slice(0, 10), comentarioAdmin: comment }
      : s
    ))
    const sol = solicitudes.find(s => s.id === id)
    if (sol) {
      addNotification({ texto: 'Tu solicitud fue rechazada', tipo: 'solicitud', empleadoId: sol.empleadoId })
      setEmpleados(prev => {
        const emp = prev.find(e => e.id === sol.empleadoId)
        if (emp?.email) {
          sendEmail('solicitud_resuelta', {
            email: emp.email,
            nombre: `${emp.nombre} ${emp.apellido}`,
            tipo: SOLICITUD_TIPO_LABEL[sol.tipo as keyof typeof SOLICITUD_TIPO_LABEL] ?? sol.tipo,
            estado: 'rechazado',
            comentario: comment,
          })
        }
        return prev
      })
    }
  }, [solicitudes, addNotification])

  // ── Novedades ──────────────────────────────────────────────────────────────
  const addNovedad = useCallback((n: Omit<Novedad, 'id'>) => {
    setNovedades(prev => [{ ...n, id: uid() }, ...prev])
    addNotification({ texto: `Nueva novedad publicada: ${n.titulo}`, tipo: 'novedad' })
  }, [addNotification])

  const deleteNovedad = useCallback((id: string) => {
    setNovedades(prev => prev.filter(n => n.id !== id))
  }, [])

  // ── Recibos ────────────────────────────────────────────────────────────────
  const addRecibo = useCallback((r: Omit<Recibo, 'id'>) => {
    setRecibos(prev => [{ ...r, id: uid() }, ...prev])
    addNotification({ texto: `Nuevo recibo de sueldo disponible`, tipo: 'recibo', empleadoId: r.empleadoId })
  }, [addNotification])

  // ── Tickets ────────────────────────────────────────────────────────────────
  const addTicket = useCallback((t: Omit<Ticket, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'estado'>) => {
    const hoy = new Date().toISOString().slice(0, 10)
    setTickets(prev => [{ ...t, id: uid(), estado: 'abierto', fechaCreacion: hoy, fechaActualizacion: hoy }, ...prev])
    addNotification({ texto: `Nuevo ticket de RRHH: ${t.asunto}`, tipo: 'ticket', empleadoId: t.empleadoId })
  }, [addNotification])

  const respondTicket = useCallback((id: string, respuesta: string, estado: TicketEstado) => {
    setTickets(prev => prev.map(t => t.id === id
      ? { ...t, respuesta, estado, fechaActualizacion: new Date().toISOString().slice(0, 10) }
      : t
    ))
  }, [])

  // ── Usuarios ───────────────────────────────────────────────────────────────
  const addUser = useCallback((u: User) => {
    setUsers(prev => [...prev, u])
    // Persist to Supabase for cross-device login
    if (supabase) {
      supabase.from('fno_users').insert({
        id: u.id, email: u.email, password: u.password,
        role: u.role, empleado_id: u.empleadoId,
      }).then()
    }
  }, [])

  const updateUserPassword = useCallback((userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u))
    if (supabase) {
      supabase.from('fno_users').update({ password: newPassword }).eq('id', userId).then()
    }
  }, [])

  const getUserByEmail = useCallback((email: string) =>
    users.find(u => u.email === email.toLowerCase().trim()),
  [users])

  const getPendingByEmail = useCallback((email: string) =>
    pendingRegistrations.find(p => p.email === email.toLowerCase().trim()),
  [pendingRegistrations])

  // ── Registro pendiente ─────────────────────────────────────────────────────
  const addPendingRegistration = useCallback((reg: Omit<PendingRegistration, 'id' | 'fechaSolicitud'>) => {
    const newReg: PendingRegistration = { ...reg, id: uid(), fechaSolicitud: new Date().toISOString().slice(0, 10) }
    setPending(prev => [...prev, newReg])
    addNotification({ texto: `Nueva solicitud de acceso: ${reg.nombre} ${reg.apellido}`, tipo: 'registro' })

    // Persist to Supabase so admin sees it from any device
    if (supabase) {
      supabase.from('fno_pending').insert({
        id: newReg.id, nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni,
        email: reg.email, password: reg.password, sector: reg.sector,
        cargo: reg.cargo, telefono: reg.telefono || '',
        fecha_solicitud: newReg.fechaSolicitud,
      }).then(({ error }) => {
        if (error) console.error('Supabase insert fno_pending error:', error)
        else console.log('Supabase insert fno_pending OK')
      })
    }

    // Email to admin
    sendEmail('new_registration', {
      nombre: reg.nombre,
      apellido: reg.apellido,
      dni: reg.dni,
      email: reg.email,
      sector: reg.sector,
      cargo: reg.cargo,
      telefono: reg.telefono || '',
    })
  }, [addNotification])

  const approvePendingRegistration = useCallback((id: string) => {
    const reg = pendingRegistrations.find(p => p.id === id)
    if (!reg) return
    const empleadoId = uid()
    const hoy = new Date().toISOString().slice(0, 10)
    const nuevoEmpleado: Empleado = {
      id: empleadoId, nombre: reg.nombre, apellido: reg.apellido, dni: reg.dni,
      fechaNacimiento: '', email: reg.email, telefono: reg.telefono,
      direccion: '', foto: '', fotoCover: '', cuil: '',
      contactoEmergencia: { nombre: '', telefono: '', relacion: '' },
      sector: reg.sector, cargo: reg.cargo,
      fechaIngreso: hoy, tipoContrato: 'Contrato', jornada: 'Full Time',
      supervisor: '', estado: 'activo', diasVacaciones: 14, diasVacacionesUsados: 0,
    }
    const nuevoUser: User = { id: uid(), email: reg.email, password: reg.password, role: 'employee', empleadoId }

    setEmpleados(prev => [...prev, nuevoEmpleado])
    setUsers(prev => [...prev, nuevoUser])
    setPending(prev => prev.filter(p => p.id !== id))
    addNotification({ texto: `Acceso aprobado para ${reg.nombre} ${reg.apellido}`, tipo: 'registro' })

    // Persist approved user + employee to Supabase
    if (supabase) {
      supabase.from('fno_users').insert({
        id: nuevoUser.id, email: nuevoUser.email, password: nuevoUser.password,
        role: nuevoUser.role, empleado_id: nuevoUser.empleadoId,
      }).then()
      supabase.from('fno_empleados').insert(mapEmpleadoToSupabase(nuevoEmpleado)).then(({ error }) => {
        if (error) console.error('Supabase insert fno_empleados (approve) error:', error)
        else console.log('Supabase: empleado aprobado guardado OK')
      })
      supabase.from('fno_pending').delete().eq('id', id).then()
    }

    // Email to registrant
    sendEmail('registration_approved', { nombre: reg.nombre, email: reg.email })
  }, [pendingRegistrations, addNotification])

  const refreshPending = useCallback(async () => {
    if (!supabase) return
    try {
      const { data } = await supabase.from('fno_pending').select('*')
      if (data && data.length > 0) {
        setPending(data.map((p: Record<string, string>) => ({
          id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni,
          email: p.email, password: p.password, sector: p.sector,
          cargo: p.cargo, telefono: p.telefono ?? '',
          fechaSolicitud: p.fecha_solicitud,
        })))
      }
    } catch (e) {
      console.error('refreshPending error:', e)
    }
  }, [])

  const rejectPendingRegistration = useCallback((id: string) => {
    const reg = pendingRegistrations.find(p => p.id === id)
    setPending(prev => prev.filter(p => p.id !== id))
    if (reg) {
      addNotification({ texto: `Solicitud de acceso rechazada: ${reg.nombre} ${reg.apellido}`, tipo: 'registro' })
      if (supabase) supabase.from('fno_pending').delete().eq('id', id).then()
      // Email to registrant
      sendEmail('registration_rejected', { nombre: reg.nombre, email: reg.email })
    }
  }, [pendingRegistrations, addNotification])

  // ── Notificaciones ─────────────────────────────────────────────────────────
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
  }, [])

  return (
    <DataContext.Provider value={{
      empleados, solicitudes, recibos, novedades, tickets, users,
      pendingRegistrations, notifications,
      addEmpleado, updateEmpleado, deleteEmpleado,
      addSolicitud, approveSolicitud, rejectSolicitud,
      addNovedad, deleteNovedad,
      addRecibo,
      addTicket, respondTicket,
      addUser, updateUserPassword, getUserByEmail, getPendingByEmail,
      addPendingRegistration, approvePendingRegistration, rejectPendingRegistration, refreshPending,
      markNotificationRead, markAllRead, addNotification,
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
