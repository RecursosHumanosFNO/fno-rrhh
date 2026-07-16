import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/perfil
// Permite que un empleado autenticado actualice sus propios datos en fno_empleados
// (o que un admin edite cualquiera). El requester se valida por JWT.
// Usa service role key para bypassear RLS.
export async function POST(req: NextRequest) {
  try {
    const { empleadoId, data } = await req.json().catch(() => ({}))

    if (!empleadoId || !data) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const esAdmin = requester.role === 'admin'
    if (!esAdmin && requester.empleadoId !== empleadoId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Campos que un empleado puede editar (lista blanca)
    const CAMPOS_EMPLEADO = [
      'nombre', 'apellido', 'dni', 'cuil', 'fecha_nacimiento',
      'telefono', 'direccion', 'contacto_emergencia', 'cbu', 'banco',
      'foto', 'foto_cover',
      // Info laboral editable por el propio empleado
      'sector', 'cargo', 'jornada', 'supervisor', 'fecha_ingreso',
    ]
    // Admins pueden editar todo; empleados solo sus campos permitidos
    const update: Record<string, unknown> = { id: empleadoId }
    if (esAdmin) {
      Object.assign(update, data)
    } else {
      for (const campo of CAMPOS_EMPLEADO) {
        if (campo in data) update[campo] = (data as Record<string, unknown>)[campo]
      }
    }

    const { error } = await sb.from('fno_empleados').upsert(update)
    if (error) {
      console.error('[perfil] upsert error:', error)
      return NextResponse.json({ error: 'No se pudieron guardar los cambios' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[perfil]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
