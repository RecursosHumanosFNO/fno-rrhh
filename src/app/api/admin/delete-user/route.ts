import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/admin/delete-user
// Body: { empleadoId: string }
// Elimina por completo a un empleado: cuenta de login (Supabase Auth) +
// fila en fno_users + fila en fno_empleados. El requester se valida por JWT.
// Solo lo puede hacer un admin.
export async function POST(req: NextRequest) {
  try {
    const { empleadoId } = await req.json().catch(() => ({}))

    if (!empleadoId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (requester.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    if (empleadoId === requester.empleadoId) {
      return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 })
    }

    // Buscar el auth_id del empleado a eliminar
    const { data: targetUser } = await sb
      .from('fno_users')
      .select('id, auth_id')
      .eq('empleado_id', empleadoId)
      .maybeSingle()

    // 1. Eliminar la cuenta de login en Supabase Auth (si existe)
    if (targetUser?.auth_id) {
      const { error: authErr } = await sb.auth.admin.deleteUser(targetUser.auth_id as string)
      if (authErr) console.error('[delete-user] auth:', authErr.message)
    }

    // 2. Eliminar las filas de las tablas
    await sb.from('fno_users').delete().eq('empleado_id', empleadoId)
    await sb.from('fno_empleados').delete().eq('id', empleadoId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[delete-user] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
