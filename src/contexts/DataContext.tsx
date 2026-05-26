'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  Empleado, Solicitud, Recibo, Novedad, Ticket, User,
  AppNotification, PendingRegistration, TicketEstado,
} from '@/types'
import * as initial from '@/lib/mockData'
import { uid } from '@/lib/utils'

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

  // Persistencia automática
  useEffect(() => { localStorage.setItem('fno_empleados', JSON.stringify(empleados)) }, [empleados])
  useEffect(() => { localStorage.setItem('fno_solicitudes', JSON.stringify(solicitudes)) }, [solicitudes])
  useEffect(() => { localStorage.setItem('fno_recibos', JSON.stringify(recibos)) }, [recibos])
  useEffect(() => { localStorage.setItem('fno_novedades', JSON.stringify(novedades)) }, [novedades])
  useEffect(() => { localStorage.setItem('fno_tickets', JSON.stringify(tickets)) }, [tickets])
  useEffect(() => { localStorage.setItem('fno_users', JSON.stringify(users)) }, [users])
  useEffect(() => { localStorage.setItem('fno_pending', JSON.stringify(pendingRegistrations)) }, [pendingRegistrations])
  useEffect(() => { localStorage.setItem('fno_notifs', JSON.stringify(notifications)) }, [notifications])

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => {
    setNotifications(prev => [{ ...n, id: uid(), fecha: new Date().toISOString().slice(0, 10), leida: false }, ...prev])
  }, [])

  // ── Empleados ──────────────────────────────────────────────────────────────
  const addEmpleado = useCallback((e: Omit<Empleado, 'id'>): string => {
    const id = uid()
    setEmpleados(prev => [...prev, { ...e, id }])
    addNotification({ texto: `Nuevo empleado registrado: ${e.nombre} ${e.apellido}`, tipo: 'sistema' })
    return id
  }, [addNotification])

  const updateEmpleado = useCallback((id: string, data: Partial<Empleado>) => {
    setEmpleados(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
  }, [])

  const deleteEmpleado = useCallback((id: string) => {
    setEmpleados(prev => prev.filter(e => e.id !== id))
    setUsers(prev => prev.filter(u => u.empleadoId !== id))
  }, [])

  // ── Solicitudes ────────────────────────────────────────────────────────────
  const addSolicitud = useCallback((s: Omit<Solicitud, 'id' | 'fechaCreacion' | 'estado'>) => {
    const nueva: Solicitud = { ...s, id: uid(), estado: 'pendiente', fechaCreacion: new Date().toISOString().slice(0, 10) }
    setSolicitudes(prev => [nueva, ...prev])
    addNotification({ texto: `Nueva solicitud de ${s.tipo.replace('_', ' ')}: requiere revisión`, tipo: 'solicitud', empleadoId: s.empleadoId })
  }, [addNotification])

  const approveSolicitud = useCallback((id: string, comment: string) => {
    setSolicitudes(prev => prev.map(s => s.id === id
      ? { ...s, estado: 'aprobado', fechaResolucion: new Date().toISOString().slice(0, 10), comentarioAdmin: comment }
      : s
    ))
    const sol = solicitudes.find(s => s.id === id)
    if (sol) addNotification({ texto: 'Tu solicitud fue aprobada', tipo: 'solicitud', empleadoId: sol.empleadoId })
  }, [solicitudes, addNotification])

  const rejectSolicitud = useCallback((id: string, comment: string) => {
    setSolicitudes(prev => prev.map(s => s.id === id
      ? { ...s, estado: 'rechazado', fechaResolucion: new Date().toISOString().slice(0, 10), comentarioAdmin: comment }
      : s
    ))
    const sol = solicitudes.find(s => s.id === id)
    if (sol) addNotification({ texto: 'Tu solicitud fue rechazada', tipo: 'solicitud', empleadoId: sol.empleadoId })
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
  }, [])

  const updateUserPassword = useCallback((userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u))
  }, [])

  const getUserByEmail = useCallback((email: string) =>
    users.find(u => u.email === email.toLowerCase().trim()),
  [users])

  const getPendingByEmail = useCallback((email: string) =>
    pendingRegistrations.find(p => p.email === email.toLowerCase().trim()),
  [pendingRegistrations])

  // ── Registro pendiente ────────────────────────────────────────────────────
  const addPendingRegistration = useCallback((reg: Omit<PendingRegistration, 'id' | 'fechaSolicitud'>) => {
    setPending(prev => [...prev, { ...reg, id: uid(), fechaSolicitud: new Date().toISOString().slice(0, 10) }])
    addNotification({ texto: `Nueva solicitud de acceso: ${reg.nombre} ${reg.apellido}`, tipo: 'registro' })
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
    setEmpleados(prev => [...prev, nuevoEmpleado])
    setUsers(prev => [...prev, { id: uid(), email: reg.email, password: reg.password, role: 'employee', empleadoId }])
    setPending(prev => prev.filter(p => p.id !== id))
    addNotification({ texto: `Acceso aprobado para ${reg.nombre} ${reg.apellido}`, tipo: 'registro' })
  }, [pendingRegistrations, addNotification])

  const rejectPendingRegistration = useCallback((id: string) => {
    const reg = pendingRegistrations.find(p => p.id === id)
    setPending(prev => prev.filter(p => p.id !== id))
    if (reg) addNotification({ texto: `Solicitud de acceso rechazada: ${reg.nombre} ${reg.apellido}`, tipo: 'registro' })
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
      addPendingRegistration, approvePendingRegistration, rejectPendingRegistration,
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
