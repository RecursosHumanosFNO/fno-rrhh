import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/admin/set-email
// Body: { empleadoId: string, newEmail: string }
// Cambia el email de login (Supabase Auth) + fno_users + fno_empleados.
// El requester se valida por JWT. Solo un admin puede hacerlo.
export async function POST(req: NextRequest) {
  try {
    const { empleadoId, newEmail } = await req.json().catch(() => ({}))

    if (!empleadoId || !newEmail) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const email = String(newEmail).toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'El email no tiene un formato válido' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (requester.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    // Buscar el usuario destino y su auth_id
    const { data: targetUser } = await sb
      .from('fno_users')
      .select('id, auth_id')
      .eq('empleado_id', empleadoId)
      .maybeSingle()

    if (!targetUser) {
      return NextResponse.json({ error: 'El empleado no tiene cuenta de acceso' }, { status: 404 })
    }

    // 1. Actualizar el email en Supabase Auth (es el que se usa para login)
    if (targetUser.auth_id) {
      const { error: authErr } = await sb.auth.admin.updateUserById(targetUser.auth_id as string, {
        email,
        email_confirm: true,
      })
      if (authErr) {
        console.error('[set-email] auth error:', authErr.message)
        return NextResponse.json({
          error: authErr.message.includes('already')
            ? 'Ya existe una cuenta con ese email'
            : 'No se pudo actualizar el email de login',
        }, { status: 400 })
      }
    }

    // 2. Actualizar fno_users.email  3. Actualizar fno_empleados.email
    await sb.from('fno_users').update({ email }).eq('id', targetUser.id as string)
    await sb.from('fno_empleados').update({ email }).eq('id', empleadoId)

    return NextResponse.json({ ok: true, email })
  } catch (err) {
    console.error('[set-email] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
