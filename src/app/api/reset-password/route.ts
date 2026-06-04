import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portalfundacion.vercel.app'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY // service role para bypasear RLS
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// POST /api/reset-password — solicitar reset
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ ok: false, error: 'Email requerido' }, { status: 400 })

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Base de datos no configurada' }, { status: 503 })
  }

  // Verificar que el usuario existe
  const { data: users } = await supabase
    .from('fno_users')
    .select('id, email, empleado_id')
    .eq('email', email.toLowerCase().trim())
    .limit(1)

  if (!users || users.length === 0) {
    // Responder igual para no revelar si el email existe
    return NextResponse.json({ ok: true })
  }

  const user = users[0]

  // Obtener nombre del empleado
  const { data: empData } = await supabase
    .from('fno_empleados')
    .select('nombre')
    .eq('id', user.empleado_id)
    .limit(1)

  const nombre = empData?.[0]?.nombre ?? 'Usuario'

  // Crear token
  const token = uid() + uid()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos

  // Guardar token en Supabase (tabla fno_password_resets)
  await supabase.from('fno_password_resets').upsert({
    email: email.toLowerCase().trim(),
    token,
    expires_at: expiresAt,
    used: false,
  })

  // Enviar email
  await fetch(`${PORTAL_URL}/api/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'reset_password',
      data: { email: email.toLowerCase().trim(), nombre, token },
    }),
  }).catch(() => null)

  return NextResponse.json({ ok: true })
}

// PUT /api/reset-password — confirmar reset con token
export async function PUT(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}))
  if (!token || !password) {
    return NextResponse.json({ ok: false, error: 'Token y contraseña requeridos' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Base de datos no configurada' }, { status: 503 })
  }

  // Buscar token
  const { data: resets } = await supabase
    .from('fno_password_resets')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .limit(1)

  if (!resets || resets.length === 0) {
    return NextResponse.json({ ok: false, error: 'Token inválido o ya utilizado' }, { status: 400 })
  }

  const reset = resets[0]

  // Verificar expiración
  if (new Date(reset.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: 'El link expiró. Solicitá uno nuevo.' }, { status: 400 })
  }

  // Buscar el auth_id del usuario para actualizar en Supabase Auth
  const { data: userData } = await supabase
    .from('fno_users')
    .select('auth_id')
    .eq('email', reset.email)
    .limit(1)

  const authId = userData?.[0]?.auth_id
  if (!authId) {
    return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Actualizar contraseña en Supabase Auth (donde realmente se valida el login)
  const { error: authErr } = await supabase.auth.admin.updateUserById(authId, { password })
  if (authErr) {
    console.error('[reset-password] auth error:', authErr.message)
    return NextResponse.json({ ok: false, error: 'No se pudo actualizar la contraseña' }, { status: 500 })
  }

  // Limpiar password en fno_users (ya no se usa para login)
  await supabase.from('fno_users').update({ password: '' }).eq('email', reset.email)

  // Marcar token como usado
  await supabase
    .from('fno_password_resets')
    .update({ used: true })
    .eq('token', token)

  return NextResponse.json({ ok: true })
}

// GET /api/reset-password?token=xxx — validar token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false })

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ valid: false })

  const { data: resets } = await supabase
    .from('fno_password_resets')
    .select('expires_at, email, used')
    .eq('token', token)
    .limit(1)

  if (!resets || resets.length === 0) return NextResponse.json({ valid: false })
  const reset = resets[0]
  if (reset.used || new Date(reset.expires_at) < new Date()) return NextResponse.json({ valid: false })

  return NextResponse.json({ valid: true, email: reset.email })
}
