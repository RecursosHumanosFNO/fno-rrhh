import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/admin/set-role
// Body: { empleadoId: string, role: 'admin' | 'employee' | 'comunicaciones' | 'rrhh' }
// El que hace el request se identifica por su JWT (Authorization: Bearer …), no
// por un id del body. Solo un admin puede cambiar roles.
export async function POST(req: NextRequest) {
  try {
    const { empleadoId, role } = await req.json().catch(() => ({}))

    if (!empleadoId || !role) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
    if (role !== 'admin' && role !== 'employee' && role !== 'comunicaciones' && role !== 'rrhh') {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (requester.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    // No permitir que el admin se quite el rol a sí mismo
    if (empleadoId === requester.empleadoId && role !== 'admin') {
      return NextResponse.json({ error: 'No podés quitarte el rol de admin a vos mismo' }, { status: 400 })
    }

    const { error } = await sb.from('fno_users').update({ role }).eq('empleado_id', empleadoId)
    if (error) {
      console.error('[set-role] error:', error.message)
      return NextResponse.json({ error: 'Error al actualizar el rol' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, role })
  } catch (err) {
    console.error('[set-role] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
