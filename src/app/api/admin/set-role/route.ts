import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/admin/set-role
// Body: { empleadoId: string, role: 'admin' | 'employee', requesterId: string }
// Cambia el rol de un usuario en fno_users. Solo lo puede llamar un admin.
export async function POST(req: NextRequest) {
  try {
    const { empleadoId, role, requesterId } = await req.json()

    if (!empleadoId || !role || !requesterId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
    if (role !== 'admin' && role !== 'employee' && role !== 'comunicaciones' && role !== 'rrhh') {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const sb = getSupabase()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    // Verificar que quien hace el request es admin
    const { data: requester } = await sb
      .from('fno_users')
      .select('role')
      .eq('empleado_id', requesterId)
      .maybeSingle()

    if (requester?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // No permitir que el admin se quite el rol a sí mismo
    if (empleadoId === requesterId && role === 'employee') {
      return NextResponse.json({ error: 'No podés quitarte el rol de admin a vos mismo' }, { status: 400 })
    }

    // Actualizar el rol en fno_users
    const { error } = await sb
      .from('fno_users')
      .update({ role })
      .eq('empleado_id', empleadoId)

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
