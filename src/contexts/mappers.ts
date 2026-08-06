// Conversiones entre las filas de Supabase (snake_case) y los tipos del
// dominio (camelCase). Son funciones puras: viven fuera del contexto para poder
// probarlas y para no seguir engordando DataContext.
import type {
  Empleado, Solicitud, Recibo, Novedad, Ticket, AppNotification, Evento,
  RegistroNovedad, EmpleadoEstado, DesvinculacionInfo, SolicitudTipo,
  SolicitudEstado, NovedadCategoria, TicketTipo, TicketEstado,
  RegistroNovedadCategoria, User, UserRole, PendingRegistration, ReciboFirma,
} from '@/types'

// ── Mappers de las tablas chicas ─────────────────────────────────────────────
// Estas tres se mapeaban a mano, y por duplicado: una vez en el sync completo y
// otra en el handler de Realtime. Duplicar el mapeo es justo el lugar donde una
// columna nueva entra por una vía y no por la otra.
export function mapSupabaseToUser(row: Record<string, string>): User {
  return { id: row.id, email: row.email, role: row.role as UserRole, empleadoId: row.empleado_id }
}

export function mapSupabaseToPending(row: Record<string, string>): PendingRegistration {
  return {
    id: row.id, nombre: row.nombre, apellido: row.apellido, dni: row.dni,
    email: row.email, sector: row.sector,
    cargo: row.cargo, telefono: row.telefono ?? '', fechaSolicitud: row.fecha_solicitud,
  }
}

export function mapSupabaseToFirma(row: Record<string, string>): ReciboFirma {
  return {
    id: row.id, reciboId: row.recibo_id, empleadoId: row.empleado_id,
    firmadoEn: row.firmado_en, userAgent: row.user_agent ?? undefined,
  }
}

// ── Mappers Supabase ↔ Empleado ──────────────────────────────────────────────
export function mapSupabaseToEmpleado(row: Record<string, unknown>): Empleado {
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
    cbu: (row.cbu as string) ?? '',
    banco: (row.banco as string) ?? '',
    desvinculacion: (row.desvinculacion as DesvinculacionInfo) ?? undefined,
    historialDesvinculaciones: (row.historial_desvinculaciones as DesvinculacionInfo[]) ?? undefined,
  }
}
export function mapEmpleadoToSupabase(e: Empleado) {
  const row: Record<string, unknown> = {
    id: e.id, nombre: e.nombre, apellido: e.apellido, dni: e.dni,
    fecha_nacimiento: e.fechaNacimiento, email: e.email, telefono: e.telefono,
    direccion: e.direccion, cuil: e.cuil,
    contacto_emergencia: e.contactoEmergencia,
    sector: e.sector, cargo: e.cargo, cargos_extra: e.cargosExtra ?? [], fecha_ingreso: e.fechaIngreso,
    tipo_contrato: e.tipoContrato, jornada: e.jornada, supervisor: e.supervisor,
    estado: e.estado,
    cbu: e.cbu ?? '', banco: e.banco ?? '',
  }
  // Solo incluir foto/fotoCover si tienen valor — el sync masivo no las carga,
  // así un upsert sin fotos no pisa las existentes en la DB.
  if (e.foto) row.foto = e.foto
  if (e.fotoCover) row.foto_cover = e.fotoCover
  // Solo incluir desvinculacion si tiene valor para no romper inserts
  // cuando la columna aún no existe en la tabla de Supabase
  if (e.desvinculacion !== undefined) row.desvinculacion = e.desvinculacion
  if (e.historialDesvinculaciones !== undefined) row.historial_desvinculaciones = e.historialDesvinculaciones
  return row
}

// ── Mappers Supabase ↔ Solicitud ─────────────────────────────────────────────
export function mapSupabaseToSolicitud(row: Record<string, unknown>): Solicitud {
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
    horarioDesde: (row.horario_desde as string) || undefined,
    horarioHasta: (row.horario_hasta as string) || undefined,
  }
}
export function mapSolicitudToSupabase(s: Solicitud, baseOnly = false) {
  const base = {
    id: s.id, empleado_id: s.empleadoId, tipo: s.tipo,
    // Fechas opcionales: null (no ''), porque una columna date rechaza el string vacío
    // y haría fallar todo el insert en silencio.
    fecha_inicio: s.fechaInicio || null, fecha_fin: s.fechaFin || null,
    descripcion: s.descripcion, estado: s.estado,
    fecha_creacion: s.fechaCreacion, fecha_resolucion: s.fechaResolucion || null,
    comentario_admin: s.comentarioAdmin ?? '', adjunto: s.adjunto ?? '',
  }
  if (baseOnly) return base
  // Faltaban en ambas direcciones: el formulario los pedía, el mail y el PDF los
  // mostraban, pero nunca llegaban a la base. Un "permiso de 14 a 16" se veía
  // bien hasta el siguiente sync y ahí perdía el horario para siempre.
  //
  // baseOnly es el reintento por si la migración todavía no se corrió — mismo
  // patrón que novedades y notifs. Sin eso, desplegar antes de la migración
  // haría fallar todos los inserts de solicitudes.
  return {
    ...base,
    horario_desde: s.horarioDesde || null,
    horario_hasta: s.horarioHasta || null,
  }
}

// ── Mappers Supabase ↔ Recibo ─────────────────────────────────────────────────
export function mapSupabaseToRecibo(row: Record<string, unknown>): Recibo {
  return {
    id: row.id as string, empleadoId: row.empleado_id as string,
    mes: row.mes as number, anio: row.anio as number,
    archivo: (row.archivo as string) ?? '', fechaSubida: row.fecha_subida as string,
    monto: row.monto as number,
    archivoUrl: (row.archivo_url as string) ?? undefined,
    concepto: (row.concepto as string) || undefined,
  }
}
export function mapReciboToSupabase(r: Recibo) {
  return {
    id: r.id, empleado_id: r.empleadoId, mes: r.mes, anio: r.anio,
    archivo: r.archivo, fecha_subida: r.fechaSubida, monto: r.monto,
    archivo_url: r.archivoUrl ?? null,
    concepto: r.concepto ?? 'Recibo mensual',
  }
}

// ── Mappers Supabase ↔ Novedad ────────────────────────────────────────────────
export function mapSupabaseToNovedad(row: Record<string, unknown>): Novedad {
  return {
    id: row.id as string, titulo: row.titulo as string,
    contenido: (row.contenido as string) ?? '',
    categoria: row.categoria as NovedadCategoria,
    fechaPublicacion: row.fecha_publicacion as string,
    autor: (row.autor as string) ?? '',
    importante: (row.importante as boolean) ?? false,
    fijado: (row.fijado as boolean) ?? false,
    imagen: (row.imagen as string) || undefined,
    adjuntoUrl: (row.adjunto_url as string) || undefined,
    adjuntoNombre: (row.adjunto_nombre as string) || undefined,
    linkUrl: (row.link_url as string) || undefined,
    destinatarios: (row.destinatarios as string[]) ?? [],
  }
}
export function mapNovedadToSupabase(n: Novedad, baseOnly = false) {
  const base = {
    id: n.id, titulo: n.titulo, contenido: n.contenido,
    categoria: n.categoria, fecha_publicacion: n.fechaPublicacion,
    autor: n.autor, importante: n.importante, fijado: n.fijado ?? false,
    imagen: n.imagen ?? '',
    adjunto_url: n.adjuntoUrl ?? null, adjunto_nombre: n.adjuntoNombre ?? null,
    link_url: n.linkUrl ?? null,
  }
  if (baseOnly) return base
  return {
    ...base,
    destinatarios: n.destinatarios ?? [],
  }
}

// ── Mappers Supabase ↔ Ticket ─────────────────────────────────────────────────
export function mapSupabaseToTicket(row: Record<string, unknown>): Ticket {
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
export function mapTicketToSupabase(t: Ticket) {
  return {
    id: t.id, empleado_id: t.empleadoId, tipo: t.tipo, asunto: t.asunto,
    descripcion: t.descripcion, estado: t.estado,
    fecha_creacion: t.fechaCreacion, fecha_actualizacion: t.fechaActualizacion,
    respuesta: t.respuesta ?? '',
  }
}

// ── Mappers Supabase ↔ AppNotification ────────────────────────────────────────
export function mapSupabaseToNotif(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string, texto: row.texto as string,
    leida: (row.leida as boolean) ?? false,
    fecha: row.fecha as string,
    tipo: row.tipo as AppNotification['tipo'],
    empleadoId: (row.empleado_id as string) || undefined,
    soloAdmin: (row.solo_admin as boolean) ?? false,
    soloEmpleado: (row.solo_empleado as boolean) ?? false,
    url: (row.url as string) || undefined,
  }
}
export function mapNotifToSupabase(n: AppNotification, baseOnly = false) {
  const base = {
    id: n.id, texto: n.texto, leida: n.leida, fecha: n.fecha,
    tipo: n.tipo, empleado_id: n.empleadoId ?? '',
  }
  if (baseOnly) return base
  return {
    ...base,
    solo_admin: n.soloAdmin ?? false,
    solo_empleado: n.soloEmpleado ?? false,
    url: n.url ?? null,
  }
}

// ── Mappers Supabase ↔ Evento ─────────────────────────────────────────────────
export function mapSupabaseToEvento(row: Record<string, unknown>): Evento {
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
    importante: (row.importante as boolean) ?? false,
    fijado: (row.fijado as boolean) ?? false,
    destinatarios: (row.destinatarios as string[]) ?? [],
  }
}
export function mapEventoToSupabase(e: Evento, baseOnly = false) {
  const base = {
    id: e.id, titulo: e.titulo, fecha: e.fecha, tipo: e.tipo,
    descripcion: e.descripcion ?? '', empleado_id: e.empleadoId ?? null,
    imagen: e.imagen ?? null,
    adjunto_url: e.adjuntoUrl ?? null, adjunto_nombre: e.adjuntoNombre ?? null,
  }
  if (baseOnly) return base
  return {
    ...base,
    importante: e.importante ?? false,
    fijado: e.fijado ?? false,
    destinatarios: e.destinatarios ?? [],
  }
}

// ── Mappers Supabase ↔ RegistroNovedad ───────────────────────────────────────
export function mapSupabaseToRegistroNovedad(row: Record<string, unknown>): RegistroNovedad {
  return {
    id: row.id as string,
    empleadoId: (row.empleado_id as string) || undefined,
    empleadoNombre: (row.empleado_nombre as string) ?? '',
    sector: (row.sector as string) ?? '',
    cargo: (row.cargo as string) ?? '',
    fecha: (row.fecha as string) ?? '',
    horaTipo: (row.hora_tipo as RegistroNovedad['horaTipo']) ?? 'sin_hora',
    hora: (row.hora as string) || undefined,
    horaDesde: (row.hora_desde as string) || undefined,
    horaHasta: (row.hora_hasta as string) || undefined,
    descripcion: (row.descripcion as string) ?? '',
    categoria: (row.categoria as RegistroNovedadCategoria) ?? 'otro',
    edificio: (row.edificio as string) || undefined,
    fotoUrl: (row.foto_url as string) || undefined,
    creadoEn: (row.creado_en as string) ?? new Date().toISOString(),
  }
}
export function mapRegistroNovedadToSupabase(r: RegistroNovedad) {
  return {
    id: r.id,
    empleado_id: r.empleadoId ?? null,
    empleado_nombre: r.empleadoNombre,
    sector: r.sector,
    cargo: r.cargo,
    fecha: r.fecha,
    hora_tipo: r.horaTipo,
    hora: r.hora ?? null,
    hora_desde: r.horaDesde ?? null,
    hora_hasta: r.horaHasta ?? null,
    descripcion: r.descripcion,
    categoria: r.categoria,
    edificio: r.edificio ?? null,
    foto_url: r.fotoUrl ?? null,
    creado_en: r.creadoEn,
  }
}
