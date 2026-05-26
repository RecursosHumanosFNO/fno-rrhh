import type { User, Empleado, Recibo, Solicitud, Novedad, Evento, Ticket } from '@/types'

export const SECTORES = [
  'Dirección General',
  'Educación',
  'Programas Sociales',
  'Administración',
  'Comunicación',
  'Mantenimiento',
  'Salud Comunitaria',
  'Tecnología',
]

export const empleados: Empleado[] = [
  {
    id: '1',
    nombre: 'Administrador',
    apellido: 'RRHH',
    dni: '00.000.000',
    fechaNacimiento: '1990-01-01',
    email: 'rrhhfundacionnqnoeste@gmail.com',
    telefono: '',
    direccion: '',
    contactoEmergencia: { nombre: '', telefono: '', relacion: '' },
    sector: 'Dirección General',
    cargo: 'Jefe de Recursos Humanos',
    fechaIngreso: '2026-01-01',
    tipoContrato: 'Planta Permanente',
    jornada: 'Full Time',
    supervisor: '',
    estado: 'activo',
    diasVacaciones: 21,
    diasVacacionesUsados: 0,
  },
]

export const users: User[] = [
  {
    id: 'u1',
    email: 'rrhhfundacionnqnoeste@gmail.com',
    password: 'adminrrhh2026',
    role: 'admin',
    empleadoId: '1',
  },
]

export const recibos: Recibo[] = []

export const solicitudes: Solicitud[] = []

export const novedades: Novedad[] = [
  {
    id: 'n1',
    titulo: 'Bienvenidos al Portal de RRHH',
    contenido: 'El Portal de Recursos Humanos de la Fundación Neuquén Oeste ya está en línea. Desde aquí podrán gestionar empleados, recibos de sueldo, solicitudes y mucho más. Ante cualquier consulta, comunicarse con el área de RRHH.',
    categoria: 'novedad',
    fechaPublicacion: '2026-05-26',
    autor: 'RRHH',
    importante: true,
  },
]

export const eventos: Evento[] = []

export const tickets: Ticket[] = []

export const estadisticasMensuales = [
  { mes: 'Ene', empleados: 0, ausencias: 0, solicitudes: 0 },
  { mes: 'Feb', empleados: 0, ausencias: 0, solicitudes: 0 },
  { mes: 'Mar', empleados: 0, ausencias: 0, solicitudes: 0 },
  { mes: 'Abr', empleados: 0, ausencias: 0, solicitudes: 0 },
  { mes: 'May', empleados: 0, ausencias: 0, solicitudes: 0 },
]

export const empleadosPorSector = SECTORES.map(sector => ({
  sector: sector.split(' ')[0],
  cantidad: empleados.filter(e => e.sector === sector).length,
})).filter(s => s.cantidad > 0)
