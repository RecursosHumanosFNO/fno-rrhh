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
  'Deportes',
  'Prácticas Restaurativas',
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
    foto: '',
    fotoCover: '',
    cuil: '',
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

export const tickets: Ticket[] = []

// ─── Feriados nacionales Argentina 2026 ───────────────────────────────────
export const feriados2026: Evento[] = [
  { id: 'f1',  titulo: 'Año Nuevo',                                fecha: '2026-01-01', tipo: 'feriado', descripcion: 'Feriado nacional' },
  { id: 'f2',  titulo: 'Carnaval',                                 fecha: '2026-02-16', tipo: 'feriado', descripcion: 'Feriado nacional' },
  { id: 'f3',  titulo: 'Carnaval',                                 fecha: '2026-02-17', tipo: 'feriado', descripcion: 'Feriado nacional' },
  { id: 'f4',  titulo: 'Día de la Memoria',                        fecha: '2026-03-24', tipo: 'feriado', descripcion: 'Por la Verdad y la Justicia' },
  { id: 'f5',  titulo: 'Día del Veterano — Malvinas',              fecha: '2026-04-02', tipo: 'feriado', descripcion: 'Feriado inamovible' },
  { id: 'f6',  titulo: 'Viernes Santo',                            fecha: '2026-04-03', tipo: 'feriado', descripcion: 'Semana Santa' },
  { id: 'f7',  titulo: 'Día del Trabajador',                       fecha: '2026-05-01', tipo: 'feriado', descripcion: 'Feriado nacional' },
  { id: 'f8',  titulo: 'Revolución de Mayo',                       fecha: '2026-05-25', tipo: 'feriado', descripcion: 'Feriado nacional' },
  { id: 'f9',  titulo: 'Paso a la Inmortalidad — Gral. Güemes',    fecha: '2026-06-15', tipo: 'feriado', descripcion: 'Trasladado al lunes' },
  { id: 'f10', titulo: 'Día de la Bandera — Paso Gral. Belgrano',  fecha: '2026-06-20', tipo: 'feriado', descripcion: 'Feriado inamovible' },
  { id: 'f11', titulo: 'Día de la Independencia',                  fecha: '2026-07-09', tipo: 'feriado', descripcion: 'Feriado nacional' },
  { id: 'f12', titulo: 'Paso a la Inmortalidad — Gral. San Martín',fecha: '2026-08-17', tipo: 'feriado', descripcion: 'Trasladado al lunes' },
  { id: 'f13', titulo: 'Día del Respeto a la Diversidad Cultural', fecha: '2026-10-12', tipo: 'feriado', descripcion: 'Trasladado al lunes' },
  { id: 'f14', titulo: 'Día de la Soberanía Nacional',             fecha: '2026-11-20', tipo: 'feriado', descripcion: 'Feriado nacional' },
  { id: 'f15', titulo: 'Inmaculada Concepción de la Virgen',       fecha: '2026-12-08', tipo: 'feriado', descripcion: 'Feriado nacional' },
  { id: 'f16', titulo: 'Navidad',                                  fecha: '2026-12-25', tipo: 'feriado', descripcion: 'Feriado nacional' },
]

// ─── Jornadas institucionales 2026 ────────────────────────────────────────
export const jornadasInstitucionales2026: Evento[] = [
  { id: 'j1', titulo: 'Jornada Institucional',  fecha: '2026-06-25', tipo: 'evento', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
  { id: 'j2', titulo: 'Jornada Institucional',  fecha: '2026-08-12', tipo: 'evento', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
  { id: 'j3', titulo: 'Jornada Institucional',  fecha: '2026-09-17', tipo: 'evento', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
  { id: 'j4', titulo: 'Jornada Institucional',  fecha: '2026-10-20', tipo: 'evento', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
  { id: 'j5', titulo: 'Jornada Institucional',  fecha: '2026-11-25', tipo: 'evento', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
]

export const eventos: Evento[] = [
  ...feriados2026,
  ...jornadasInstitucionales2026,
]

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
