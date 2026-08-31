import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portalfno.com'

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutos
// Ventana mínima entre dos pedidos de reset para el mismo email. Sin esto,
// cualquiera puede disparar el endpoint en bucle y bombardear la casilla de
// un empleado (y de paso quemar la cuota de envío de Gmail).
const REENVIO_MIN_MS = 60 * 1000

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY // service role para bypasear RLS
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/reset-password — solicitar reset
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ ok: false, error: 'Email requerido' }, { status: 400 })

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Base de datos no configurada' }, { status: 503 })
  }

  const emailNorm = String(email).toLowerCase().trim()

  // Verificar que el usuario existe
  const { data: users } = await supabase
    .from('fno_users')
    .select('id, email, empleado_id')
    .eq('email', emailNorm)
    .limit(1)

  if (!users || users.length === 0) {
    // Responder igual para no revelar si el email existe
    return NextResponse.json({ ok: true })
  }

  const user = users[0]

  // Throttle por email. La tabla guarda una fila por email (upsert), así que
  // deducimos cuándo se creó el token vigente a partir de su vencimiento en
  // vez de sumar una columna nueva.
  const { data: previos } = await supabase
    .from('fno_password_resets')
    .select('expires_at, used')
    .eq('email', emailNorm)
    .limit(1)

  const previo = previos?.[0]
  if (previo && !previo.used) {
    const creadoHace = TOKEN_TTL_MS - (new Date(previo.expires_at).getTime() - Date.now())
    if (creadoHace < REENVIO_MIN_MS) {
      // Mismo cuerpo que el caso normal: no delatamos que hubo throttling.
      return NextResponse.json({ ok: true })
    }
  }

  // Obtener nombre del empleado
  const { data: empData } = await supabase
    .from('fno_empleados')
    .select('nombre')
    .eq('id', user.empleado_id)
    .limit(1)

  const nombre = empData?.[0]?.nombre ?? 'Usuario'

  // Crear token con entropía criptográfica (no Math.random, que es predecible)
  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

  // Guardar token en Supabase (tabla fno_password_resets)
  await supabase.from('fno_password_resets').upsert({
    email: emailNorm,
    token,
    expires_at: expiresAt,
    used: false,
  })

  // Enviar email
  await fetch(`${PORTAL_URL}/api/notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Llamada server-to-server: no hay usuario logueado (olvidó la contraseña).
      ...(process.env.CRON_SECRET ? { 'x-internal-key': process.env.CRON_SECRET } : {}),
    },
    body: JSON.stringify({
      type: 'reset_password',
      data: { email: emailNorm, nombre, token },
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
  // Diez y no seis: seis caracteres se prueban por fuerza bruta en minutos, y
  // esta contraseña abre recibos de sueldo y datos personales de terceros.
  if (password.length < 10) {
    return NextResponse.json({ ok: false, error: 'La contraseña debe tener al menos 10 caracteres' }, { status: 400 })
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
