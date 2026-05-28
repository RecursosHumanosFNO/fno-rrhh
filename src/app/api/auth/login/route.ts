import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/auth/login
// Body: { email: string, password: string }
// Valida credenciales server-side (nunca expone contraseñas al cliente)
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const sb = getSupabase()
    if (!sb) {
      return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })
    }

    const { data: user } = await sb
      .from('fno_users')
      .select('id, email, role, empleado_id, password')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (!user || user.password !== password) {
      // Mismo mensaje para email inválido y contraseña incorrecta (evita user enumeration)
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    // Nunca devolver la contraseña al cliente
    return NextResponse.json({
      user: {
        id: user.id as string,
        email: user.email as string,
        role: user.role as string,
        empleadoId: user.empleado_id as string,
        password: '', // campo vacío — la clave real nunca sale del servidor
      },
    })
  } catch (err) {
    console.error('[auth/login] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
