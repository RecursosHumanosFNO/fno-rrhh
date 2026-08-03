import { describe, it, expect } from 'vitest'
import {
  mapSupabaseToEmpleado, mapEmpleadoToSupabase,
  mapSupabaseToSolicitud, mapSupabaseToNotif, mapNotifToSupabase,
  mapSupabaseToUser, mapSupabaseToPending, mapSupabaseToFirma,
} from './mappers'
import type { Empleado, AppNotification } from '@/types'

describe('mapSupabaseToEmpleado', () => {
  it('pasa snake_case a camelCase', () => {
    const emp = mapSupabaseToEmpleado({
      id: '1', nombre: 'Ana', apellido: 'Pérez',
      fecha_nacimiento: '1990-05-10', fecha_ingreso: '2020-03-01',
      foto_cover: 'cover.jpg', cargos_extra: ['Tutora'],
    })
    expect(emp.fechaNacimiento).toBe('1990-05-10')
    expect(emp.fechaIngreso).toBe('2020-03-01')
    expect(emp.fotoCover).toBe('cover.jpg')
    expect(emp.cargosExtra).toEqual(['Tutora'])
  })

  it('completa con vacíos las columnas nulas en vez de dejar undefined', () => {
    // La UI hace .trim() y compara strings sobre estos campos: un undefined
    // suelto rompe la pantalla del empleado.
    const emp = mapSupabaseToEmpleado({ id: '1' })
    expect(emp.nombre).toBe('')
    expect(emp.telefono).toBe('')
    expect(emp.cargosExtra).toEqual([])
  })

  it('siempre devuelve contactoEmergencia completo', () => {
    // Si la fila no lo trae, la ficha lee .nombre de undefined y explota.
    const emp = mapSupabaseToEmpleado({ id: '1' })
    expect(emp.contactoEmergencia).toEqual({ nombre: '', telefono: '', relacion: '' })
  })

  it('respeta el contacto de emergencia cuando viene', () => {
    const emp = mapSupabaseToEmpleado({
      id: '1',
      contacto_emergencia: { nombre: 'Juan', telefono: '299', relacion: 'Padre' },
    })
    expect(emp.contactoEmergencia.nombre).toBe('Juan')
    expect(emp.contactoEmergencia.relacion).toBe('Padre')
  })

  it('asume activo si no viene el estado', () => {
    // Un empleado sin estado no puede quedar fuera del portal por defecto.
    expect(mapSupabaseToEmpleado({ id: '1' }).estado).toBe('activo')
  })
})

describe('ida y vuelta de Empleado', () => {
  it('conserva los campos al convertir en los dos sentidos', () => {
    const original: Empleado = {
      id: '1', nombre: 'Ana', apellido: 'Pérez', dni: '30123456',
      fechaNacimiento: '1990-05-10', email: 'a@e.com', telefono: '299',
      direccion: 'Calle 1', foto: '', fotoCover: '', cuil: '27301234568',
      contactoEmergencia: { nombre: 'Juan', telefono: '299', relacion: 'Padre' },
      sector: 'Administración', cargo: 'Secretaria', cargosExtra: [],
      fechaIngreso: '2020-03-01', tipoContrato: 'Contrato', jornada: 'Full Time',
      supervisor: 'Ana', estado: 'activo', cbu: '', banco: '',
    }
    const vuelta = mapSupabaseToEmpleado(mapEmpleadoToSupabase(original) as Record<string, unknown>)
    expect(vuelta).toEqual(original)
  })
})

describe('mapSupabaseToSolicitud', () => {
  it('traduce las fechas y el comentario del admin', () => {
    const sol = mapSupabaseToSolicitud({
      id: 's1', empleado_id: 'e1', tipo: 'vacaciones', estado: 'aprobado',
      fecha_inicio: '2026-01-10', fecha_creacion: '2026-01-01',
      fecha_resolucion: '2026-01-02', comentario_admin: 'Ok',
    })
    expect(sol.empleadoId).toBe('e1')
    expect(sol.fechaInicio).toBe('2026-01-10')
    expect(sol.fechaResolucion).toBe('2026-01-02')
    expect(sol.comentarioAdmin).toBe('Ok')
  })
})

describe('mapNotifToSupabase', () => {
  const notif: AppNotification = {
    id: 'n1', texto: 'Hola', leida: false, fecha: '2026-01-01',
    tipo: 'novedad', url: '/dashboard/recibos',
  }

  it('incluye las columnas nuevas por defecto', () => {
    const row = mapNotifToSupabase(notif) as Record<string, unknown>
    expect(row.url).toBe('/dashboard/recibos')
    expect(row.solo_admin).toBe(false)
  })

  it('las omite en modo base, que es el reintento cuando falta la migración', () => {
    const row = mapNotifToSupabase(notif, true) as Record<string, unknown>
    expect('url' in row).toBe(false)
    expect('solo_admin' in row).toBe(false)
    // Lo esencial tiene que seguir estando para que el insert sirva.
    expect(row.texto).toBe('Hola')
  })
})

describe('mapSupabaseToNotif', () => {
  it('deja la url en undefined si la columna todavía no existe', () => {
    const n = mapSupabaseToNotif({ id: 'n1', texto: 'Hola', fecha: '2026-01-01', tipo: 'sistema' })
    expect(n.url).toBeUndefined()
    expect(n.leida).toBe(false)
  })
})

// Estas tres estaban duplicadas a mano en el sync y en el handler de Realtime.
// Los tests fijan el mapeo ahora que hay una sola copia.
describe('mappers de las tablas chicas', () => {
  it('mapSupabaseToUser pasa empleado_id a empleadoId', () => {
    const u = mapSupabaseToUser({ id: 'u1', email: 'a@b.com', role: 'rrhh', empleado_id: 'e1' })
    expect(u.empleadoId).toBe('e1')
    expect(u.role).toBe('rrhh')
  })

  it('mapSupabaseToPending deja el telefono vacio si viene null', () => {
    const p = mapSupabaseToPending({
      id: 'p1', nombre: 'Ana', apellido: 'Diaz', dni: '30123456', email: 'a@b.com',
      password: 'x', sector: 'Admin', cargo: 'Asistente',
      telefono: null as unknown as string, fecha_solicitud: '2026-01-01',
    })
    expect(p.telefono).toBe('')
    expect(p.fechaSolicitud).toBe('2026-01-01')
  })

  it('mapSupabaseToFirma deja userAgent en undefined si no vino', () => {
    const f = mapSupabaseToFirma({
      id: 'f1', recibo_id: 'r1', empleado_id: 'e1',
      firmado_en: '2026-01-01T10:00:00Z', user_agent: null as unknown as string,
    })
    expect(f.reciboId).toBe('r1')
    expect(f.empleadoId).toBe('e1')
    expect(f.userAgent).toBeUndefined()
  })
})
