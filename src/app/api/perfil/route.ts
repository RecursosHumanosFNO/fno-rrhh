import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/perfil
// Permite que un empleado autenticado actualice sus propios datos en fno_empleados.
// Usa service role key para bypassear RLS.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authId, empleadoId, data } = body

    if (!authId || !empleadoId || !data) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = getSupabase()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    // Verificar que el authId corresponde al empleadoId (o es admin)
    const { data: userRow } = await sb
      .from('fno_users')
      .select('role, empleado_id')
      .eq('auth_id', authId)
      .maybeSingle()

    if (!userRow) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })
    const esAdmin = userRow.role === 'admin'
    if (!esAdmin && userRow.empleado_id !== empleadoId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Campos que un empleado puede editar (lista blanca)
    const CAMPOS_EMPLEADO = [
      'nombre', 'apellido', 'dni', 'cuil', 'fecha_nacimiento',
      'telefono', 'direccion', 'contacto_emergencia', 'cbu', 'banco',
      'foto', 'foto_cover',
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
