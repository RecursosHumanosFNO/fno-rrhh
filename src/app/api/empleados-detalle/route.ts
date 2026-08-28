import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// GET /api/empleados-detalle
//
// Devuelve los datos personales y laborales de los legajos:
//  - Gestión de Personal (admin y rrhh) → todos los empleados.
//  - Cualquier otro empleado → únicamente su propio legajo.
//
// El sync general del cliente trae sólo el directorio (nombre, sector, cargo,
// foto, cumpleaños). Antes traía todo esto también, y la separación por rol
// existía nada más que en la pantalla.
//
// Las columnas que sirve esta ruta son justamente las que la migración
// 2026-08-24-rls-empleados.sql le revoca al rol `authenticated`, para que el
// navegador no pueda pedirlas por su cuenta.
export async function GET(req: NextRequest) {
  try {
    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // La lista va literal y no en una constante: Supabase infiere el tipo de la
    // fila a partir del string, y con una constante devuelve GenericStringError.
    const query = sb.from('fno_empleados')
      .select('id, dni, cuil, direccion, telefono, contacto_emergencia, cbu, banco, desvinculacion, historial_desvinculaciones, fecha_ingreso, tipo_contrato, jornada, supervisor, credencial_art, credencial_art_nombre, credencial_art_subida_en')

    // Sin empleadoId no hay legajo propio que devolver: mejor una lista vacía
    // que una consulta sin filtro.
    const { data, error } = esGestionPersonal(requester)
      ? await query
      : await query.eq('id', requester.empleadoId ?? '__sin_empleado__')

    if (error) {
      console.error('[empleados-detalle] query:', error.message)
      return NextResponse.json({ error: 'No se pudo leer el detalle' }, { status: 500 })
    }

    // A camelCase, igual que el resto del dominio. Se omiten las claves que
    // vienen nulas para que fusionarDetalle no pise con undefined.
    const empleados = (data ?? []).map((r: Record<string, unknown>) => {
      const ce = (r.contacto_emergencia as Record<string, string>) ?? {}
      return {
        id: r.id as string,
        dni: (r.dni as string) ?? '',
        cuil: (r.cuil as string) ?? '',
        direccion: (r.direccion as string) ?? '',
        telefono: (r.telefono as string) ?? '',
        contactoEmergencia: {
          nombre: ce.nombre ?? '', telefono: ce.telefono ?? '', relacion: ce.relacion ?? '',
        },
        cbu: (r.cbu as string) ?? '',
        banco: (r.banco as string) ?? '',
        desvinculacion: r.desvinculacion ?? undefined,
        historialDesvinculaciones: r.historial_desvinculaciones ?? undefined,
        fechaIngreso: (r.fecha_ingreso as string) ?? '',
        tipoContrato: (r.tipo_contrato as string) ?? 'Contrato',
        jornada: (r.jornada as string) ?? 'Full Time',
        supervisor: (r.supervisor as string) ?? '',
      }
    })

    return NextResponse.json({ empleados })
  } catch (err) {
    console.error('[empleados-detalle] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
