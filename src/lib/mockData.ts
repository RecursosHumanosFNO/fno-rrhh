import type { User, Empleado, Recibo, Solicitud, Novedad, Evento, Ticket } from '@/types'

export const SECTORES = [
  'Dirección General',
  'Administración',
  'Colegio Primario',
  'Secundario',
  'Secundario Adultos',
  'Kinesiología',
  'Radio',
  'CPREM',
  'Espacio Cultural',
  'Área de Deportes',
  'Buffet',
  'Hidroponía',
]

// ─── Lista plana de puestos (para filtros y comunicaciones) ──────────────────
export const PUESTOS = [
  'Director/a General',
  'Coordinador/a',
  'Encargado/a de Área',
  'Encargado/a de RRHH',
  'Docente / Maestro/a',
  'Profesor/a',
  'Preceptor/a',
  'Auxiliar Docente',
  'Psicopedagogo/a',
  'Orientador/a Escolar',
  'Administrativo/a',
  'Admin. Contable',
  'Recepcionista',
  'Asistente',
  'Auxiliar de Servicio',
  'Personal de Mantenimiento',
  'Kinesiólogo/a',
  'Técnico/a',
  'Locutor/a',
  'Operador/a / Productor/a',
  'Facilitador/a',
  'Tallerista / Instructor/a',
  'Profesor/a de Deportes',
  'Entrenador/a',
  'Encargado/a de Buffet',
  'Cocinero/a',
  'Operario/a Hidroponía',
  'Otro (especificar)',
]

export const CARGOS_POR_SECTOR: Record<string, string[]> = {
  'Dirección General': [
    'Director/a General',
    'Jefe/a de Recursos Humanos',
    'Coordinador/a General',
    'Asistente de Dirección',
  ],
  'Administración': [
    'Administrativo/a',
    'Contador/a',
    'Tesorero/a',
    'Secretario/a',
    'Recepcionista',
    'Auxiliar Administrativo/a',
  ],
  'Colegio Primario': [
    'Maestro/a de Grado',
    'Docente',
    'Coordinador/a Pedagógico/a',
    'Preceptor/a',
    'Auxiliar Docente',
    'Psicopedagogo/a',
  ],
  'Secundario': [
    'Profesor/a',
    'Preceptor/a',
    'Coordinador/a Pedagógico/a',
    'Auxiliar Docente',
    'Orientador/a Escolar',
  ],
  'Secundario Adultos': [
    'Profesor/a',
    'Preceptor/a',
    'Coordinador/a',
    'Auxiliar Docente',
  ],
  'Kinesiología': [
    'Kinesiólogo/a',
    'Asistente de Kinesiología',
    'Coordinador/a de Salud',
  ],
  'Radio': [
    'Locutor/a',
    'Operador/a Técnico/a',
    'Productor/a',
    'Periodista',
    'Coordinador/a de Radio',
  ],
  'CPREM': [
    'Coordinador/a',
    'Técnico/a en Comunicación',
    'Facilitador/a',
    'Operador/a Multimedia',
  ],
  'Espacio Cultural': [
    'Coordinador/a Cultural',
    'Tallerista',
    'Animador/a Sociocultural',
    'Instructor/a',
  ],
  'Área de Deportes': [
    'Profesor/a de Educación Física',
    'Entrenador/a',
    'Coordinador/a Deportivo/a',
    'Auxiliar Deportivo/a',
  ],
  'Buffet': [
    'Encargado/a de Buffet',
    'Cocinero/a',
    'Ayudante de Cocina',
    'Cajero/a',
  ],
  'Hidroponía': [
    'Técnico/a en Hidroponía',
    'Operario/a',
    'Coordinador/a de Huerta',
  ],
}

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
  { id: 'j1', titulo: 'Jornada Institucional',  fecha: '2026-06-25', tipo: 'jornada', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
  { id: 'j2', titulo: 'Jornada Institucional',  fecha: '2026-08-12', tipo: 'jornada', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
  { id: 'j3', titulo: 'Jornada Institucional',  fecha: '2026-09-17', tipo: 'jornada', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
  { id: 'j4', titulo: 'Jornada Institucional',  fecha: '2026-10-20', tipo: 'jornada', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
  { id: 'j5', titulo: 'Jornada Institucional',  fecha: '2026-11-25', tipo: 'jornada', descripcion: 'Jornada institucional obligatoria — Fundación Neuquén Oeste' },
]

// ─── Actos escolares nivel secundario 2026 ────────────────────────────────
// Fechas extraídas del Padlet CNO 2026 (eventosPadlet-CNO-2026.pdf)
export const actosEscolares2026: Evento[] = [
  // ── Inicio del ciclo lectivo ──────────────────────────────────────────────
  { id: 'a0',  titulo: 'Inicio de Clases 2026',                fecha: '2026-03-02', tipo: 'acto',     descripcion: 'Primer día del ciclo lectivo 2026 — Nivel Secundario' },
  // ── Actos patrióticos ────────────────────────────────────────────────────
  { id: 'a1',  titulo: 'Acto Día de la Memoria',               fecha: '2026-03-24', tipo: 'acto',     descripcion: 'Acto por el Día Nacional de la Memoria por la Verdad y la Justicia' },
  { id: 'a2',  titulo: 'Acto Día del Veterano y los Caídos',   fecha: '2026-04-01', tipo: 'acto',     descripcion: 'Acto conmemorativo — Guerra de Malvinas (previo al feriado del 2/4)' },
  { id: 'a3',  titulo: 'Acto Revolución de Mayo',              fecha: '2026-05-22', tipo: 'acto',     descripcion: 'Acto escolar por el 25 de Mayo — Nivel Secundario' },
  { id: 'a4',  titulo: 'Acto Día de la Bandera',               fecha: '2026-06-19', tipo: 'acto',     descripcion: 'Acto en honor al Gral. Belgrano y la Bandera Nacional' },
  { id: 'a5',  titulo: 'Acto Día de la Independencia',         fecha: '2026-07-08', tipo: 'acto',     descripcion: 'Acto escolar por el 9 de Julio — Nivel Secundario' },
  // ── Receso invernal ──────────────────────────────────────────────────────
  { id: 'r1',  titulo: 'Receso Escolar de Invierno',           fecha: '2026-07-13', tipo: 'receso',   descripcion: 'Inicio del receso invernal. Retorno a clases: lunes 27 de julio' },
  // ── Semanas de Proyectos ─────────────────────────────────────────────────
  { id: 'p1',  titulo: 'Semana de Proyectos — 1.ª instancia',  fecha: '2026-04-13', tipo: 'proyecto', descripcion: 'Presentación y evaluación de proyectos interdisciplinarios (13 al 17 de abril)' },
  { id: 'p2',  titulo: 'Semana de Proyectos — 2.ª instancia',  fecha: '2026-08-18', tipo: 'proyecto', descripcion: 'Presentación y evaluación de proyectos interdisciplinarios (18 al 21 de agosto)' },
  // ── Actos segundo semestre ───────────────────────────────────────────────
  { id: 'a6',  titulo: 'Acto Paso a la Inmortalidad San Martín', fecha: '2026-08-14', tipo: 'acto',   descripcion: 'Acto en honor al Libertador General San Martín' },
  { id: 'a7',  titulo: 'Acto Día del Maestro',                  fecha: '2026-09-11', tipo: 'acto',    descripcion: 'Acto en homenaje a Domingo Faustino Sarmiento' },
  { id: 'a8',  titulo: 'Acto Diversidad Cultural',              fecha: '2026-10-09', tipo: 'acto',    descripcion: 'Acto por el Día del Respeto a la Diversidad Cultural' },
  { id: 'a9',  titulo: 'Acto Soberanía Nacional',               fecha: '2026-11-19', tipo: 'acto',    descripcion: 'Acto por el Día de la Soberanía Nacional' },
  // ── Cierre del ciclo lectivo ─────────────────────────────────────────────
  { id: 'a10', titulo: 'Acto de Colación y Cierre',             fecha: '2026-12-04', tipo: 'acto',    descripcion: 'Acto de cierre del ciclo lectivo y reconocimiento — Nivel Secundario' },
]

export const eventos: Evento[] = [
  ...feriados2026,
  ...jornadasInstitucionales2026,
  ...actosEscolares2026,
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
