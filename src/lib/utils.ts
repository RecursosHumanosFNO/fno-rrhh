import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SolicitudTipo, SolicitudEstado, NovedadCategoria, TicketEstado, TicketTipo, EmpleadoEstado, EventoTipo } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parsea una fecha "YYYY-MM-DD" como fecha LOCAL (evita bug de zona horaria UTC)
 * Sin esto, new Date("1990-07-16") en Argentina (UTC-3) muestra el 15
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatFecha(fecha: string): string {
  if (!fecha) return '-'
  const d = parseLocalDate(fecha)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function formatMes(mes: number, anio: number): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${meses[mes - 1]} ${anio}`
}

export function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(monto)
}

export function calcularAntiguedad(fechaIngreso: string): string {
  const inicio = parseLocalDate(fechaIngreso)
  const hoy = new Date()
  const anios = hoy.getFullYear() - inicio.getFullYear()
  const meses = hoy.getMonth() - inicio.getMonth()
  const totalMeses = anios * 12 + meses
  if (totalMeses < 1) return 'Menos de 1 mes'
  if (totalMeses < 12) return `${totalMeses} ${totalMeses === 1 ? 'mes' : 'meses'}`
  const a = Math.floor(totalMeses / 12)
  const m = totalMeses % 12
  let str = `${a} ${a === 1 ? 'año' : 'años'}`
  if (m > 0) str += ` y ${m} ${m === 1 ? 'mes' : 'meses'}`
  return str
}

export function calcularEdad(fechaNacimiento: string): number {
  const nac = parseLocalDate(fechaNacimiento)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

export function getBirthdayThisYear(fechaNacimiento: string): Date {
  const nac = parseLocalDate(fechaNacimiento)
  const hoy = new Date()
  return new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())
}

export const SOLICITUD_TIPO_LABEL: Record<SolicitudTipo, string> = {
  // Asistencia
  ausencia:                       'Ausencia',
  llegada_tarde:                  'Llegada Tarde',
  salida_anticipada:              'Salida Anticipada',
  // Licencias
  licencia_medica:                'Licencia Médica',
  licencia_estudio:               'Licencia por Estudio',
  licencia_maternidad_paternidad: 'Licencia Maternidad / Paternidad',
  licencia_duelo:                 'Licencia por Duelo',
  // Tiempo libre
  vacaciones:                     'Vacaciones',
  permiso_personal:               'Permiso Personal',
  // Jornada
  horas_extra:                    'Horas Extra',
  cambio_turno:                   'Cambio de Turno / Cobertura',
  guardia_turno_especial:         'Guardia / Turno Especial',
  tarea_fuera_area:               'Tarea Fuera del Área',
  // Formación
  capacitacion:                   'Capacitación / Formación',
  // Incidentes / RRHH
  accidente_laboral:              'Accidente Laboral',
  suspension:                     'Suspensión',
  observacion_comportamiento:     'Observación de Comportamiento',
  conflicto_interpersonal:        'Conflicto Interpersonal',
  // Administrativo
  entrega_documentacion:          'Entrega de Documentación',
  reconocimiento:                 'Reconocimiento / Felicitación',
  pedido_administrativo:          'Pedido Administrativo',
  otro:                           'Otro',
}

export const SOLICITUD_ESTADO_LABEL: Record<SolicitudEstado, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

export const SOLICITUD_ESTADO_COLOR: Record<SolicitudEstado, string> = {
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  aprobado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rechazado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export const EMPLEADO_ESTADO_LABEL: Record<EmpleadoEstado, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  licencia: 'En Licencia',
  vacaciones: 'De Vacaciones',
}

export const EMPLEADO_ESTADO_COLOR: Record<EmpleadoEstado, string> = {
  activo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactivo: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  licencia: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  vacaciones: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export const NOVEDAD_CATEGORIA_LABEL: Record<NovedadCategoria, string> = {
  comunicado: 'Comunicado',
  novedad: 'Novedad',
  alerta: 'Alerta',
  evento: 'Evento',
  cumpleanos: 'Cumpleaños',
}

export const NOVEDAD_CATEGORIA_COLOR: Record<NovedadCategoria, string> = {
  comunicado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  novedad: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  alerta: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  evento: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  cumpleanos: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
}

export const TICKET_ESTADO_LABEL: Record<TicketEstado, string> = {
  abierto: 'Abierto',
  en_proceso: 'En Proceso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

export const TICKET_ESTADO_COLOR: Record<TicketEstado, string> = {
  abierto: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  en_proceso: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  resuelto: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cerrado: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export const TICKET_TIPO_LABEL: Record<TicketTipo, string> = {
  certificado_laboral: 'Certificado Laboral',
  consulta: 'Consulta General',
  actualizacion_datos: 'Actualización de Datos',
  reclamo: 'Reclamo',
  otro: 'Otro',
}

export const EVENTO_TIPO_LABEL: Record<EventoTipo, string> = {
  feriado:     '🇦🇷 Feriado',
  jornada:     '🏫 Jornada Institucional',
  acto:        '🎗️ Acto Escolar',
  capacitacion:'📚 Capacitación',
  reunion:     '🤝 Reunión de Personal',
  receso:      '🏖️ Receso Escolar',
  proyecto:    '🔬 Semana de Proyectos',
  institucional:'🏛️ Evento Institucional',
  reunion_padres:'👨‍👩‍👧 Reunión de Padres',
  examen:      '📝 Exámenes / Mesas',
  inscripciones:'📋 Inscripciones',
  salida:      '🚌 Salida / Excursión',
  religioso:   '✝️ Celebración Religiosa',
  otro:        '📌 Otro',
}

export const EVENTO_TIPO_COLOR: Record<EventoTipo, string> = {
  feriado:     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  jornada:     'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  acto:        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  capacitacion:'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  reunion:     'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  receso:      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  proyecto:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  institucional:'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  reunion_padres:'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  examen:      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  inscripciones:'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  salida:      'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  religioso:   'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  otro:        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

export const EVENTO_TIPO_DOT: Record<EventoTipo, string> = {
  feriado:     'bg-blue-500',
  jornada:     'bg-purple-500',
  acto:        'bg-amber-500',
  capacitacion:'bg-emerald-500',
  reunion:     'bg-orange-500',
  receso:      'bg-cyan-500',
  proyecto:    'bg-green-500',
  institucional:'bg-indigo-500',
  reunion_padres:'bg-rose-500',
  examen:      'bg-red-500',
  inscripciones:'bg-teal-500',
  salida:      'bg-lime-500',
  religioso:   'bg-violet-500',
  otro:        'bg-slate-400',
}

export function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
