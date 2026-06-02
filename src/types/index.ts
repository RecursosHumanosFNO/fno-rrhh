export type UserRole = 'admin' | 'employee'

export type EmpleadoEstado = 'activo' | 'inactivo' | 'licencia' | 'vacaciones'

export type SolicitudEstado = 'pendiente' | 'aprobado' | 'rechazado'

export type SolicitudTipo =
  // Asistencia
  | 'ausencia'
  | 'llegada_tarde'
  | 'salida_anticipada'
  // Licencias
  | 'licencia_medica'
  | 'licencia_estudio'
  | 'licencia_maternidad_paternidad'
  | 'licencia_duelo'
  // Tiempo libre
  | 'vacaciones'
  | 'permiso_personal'
  // Jornada
  | 'horas_extra'
  | 'cambio_turno'
  | 'guardia_turno_especial'
  | 'tarea_fuera_area'
  // Formación
  | 'capacitacion'
  // Incidentes / RRHH
  | 'accidente_laboral'
  | 'suspension'
  | 'observacion_comportamiento'
  | 'conflicto_interpersonal'
  // Administrativo
  | 'entrega_documentacion'
  | 'reconocimiento'
  | 'pedido_administrativo'
  | 'otro'

// Las novedades comparten las categorías de eventos + sus propias (comunicado, alerta, etc.)
export type NovedadCategoria =
  | 'comunicado' | 'novedad' | 'alerta' | 'evento' | 'cumpleanos'
  | EventoTipo

export type TicketEstado = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'

export type TicketTipo =
  | 'certificado_laboral'
  | 'consulta'
  | 'actualizacion_datos'
  | 'reclamo'
  | 'otro'

export interface User {
  id: string
  email: string
  /** Nunca se carga desde el servidor. Solo se usa localmente al aprobar un registro. */
  password?: string
  role: UserRole
  empleadoId: string
}

export interface PendingRegistration {
  id: string
  nombre: string
  apellido: string
  dni: string
  email: string
  password: string
  sector: string
  cargo: string
  telefono: string
  fechaSolicitud: string
}

export interface Empleado {
  id: string
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  email: string
  telefono: string
  direccion: string
  foto: string
  fotoCover: string
  cuil: string
  contactoEmergencia: {
    nombre: string
    telefono: string
    relacion: string
  }
  sector: string
  cargo: string
  fechaIngreso: string
  tipoContrato: 'Contrato' | 'Período de prueba'
  jornada: 'Full Time' | 'Part Time' | '6 horas diarias'
  supervisor: string
  estado: EmpleadoEstado
  diasVacaciones: number
  diasVacacionesUsados: number
  cbu?: string
  banco?: string
}

export interface Recibo {
  id: string
  empleadoId: string
  mes: number
  anio: number
  archivo: string
  archivoUrl?: string  // URL pública en Supabase Storage
  fechaSubida: string
  monto: number
  concepto?: string    // 'Recibo mensual' | 'Sueldo Anual Complementario' | ...
}

export interface Solicitud {
  id: string
  empleadoId: string
  tipo: SolicitudTipo
  fechaInicio: string
  fechaFin?: string
  horarioDesde?: string
  horarioHasta?: string
  descripcion: string
  estado: SolicitudEstado
  fechaCreacion: string
  fechaResolucion?: string
  comentarioAdmin?: string
  adjunto?: string
}

export interface Novedad {
  id: string
  titulo: string
  contenido: string
  categoria: NovedadCategoria
  fechaPublicacion: string
  autor: string
  importante: boolean
  imagen?: string
}

export type EventoTipo =
  | 'feriado' | 'jornada' | 'acto' | 'capacitacion' | 'reunion'
  | 'receso' | 'proyecto' | 'institucional' | 'reunion_padres'
  | 'examen' | 'inscripciones' | 'salida' | 'religioso' | 'otro'

export interface Evento {
  id: string
  titulo: string
  fecha: string
  tipo: EventoTipo
  descripcion?: string
  empleadoId?: string
  imagen?: string
}

export interface Ticket {
  id: string
  empleadoId: string
  tipo: TicketTipo
  asunto: string
  descripcion: string
  estado: TicketEstado
  fechaCreacion: string
  fechaActualizacion: string
  respuesta?: string
}

export interface AppNotification {
  id: string
  texto: string
  leida: boolean
  fecha: string
  tipo: 'solicitud' | 'novedad' | 'recibo' | 'ticket' | 'registro' | 'sistema'
  empleadoId?: string
  soloAdmin?: boolean     // Si es true, solo visible para admin
  soloEmpleado?: boolean  // Si es true, solo visible para el empleado destino (no el admin)
}

export interface AuthState {
  user: User | null
  empleado: Empleado | null
  isAuthenticated: boolean
}
