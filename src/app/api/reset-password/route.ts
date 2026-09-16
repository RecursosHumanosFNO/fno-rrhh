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

  // Verificar que el usuario existe.
  //
  // ilike y no eq: para las personas el email no distingue mayúsculas, pero
  // Postgres sí. Una fila guardada como "Nombre@gmail.com" no la encontraba
  // esta búsqueda en minúsculas, y como al email desconocido se le contesta
  // ok:true sin mandar nada, el resultado era una pantalla que decía "¡Email
  // enviado!" y ningún mail, para siempre y sin ningún rastro.
  //
  // Los comodines de LIKE van escapados: sin eso, un email con guion bajo
  // —juan_perez@…, que es de lo más común— haría que el _ matchee cualquier
  // carácter y la búsqueda pudiera traer la cuenta de otra persona.
  const patron = emailNorm.replace(/[\\%_]/g, c => `\\${c}`)
  const { data: users } = await supabase
    .from('fno_users')
    .select('id, email, empleado_id')
    .ilike('email', patron)
    .limit(1)

  if (!users || users.length === 0) {
    // Al que pide se le contesta igual que en el caso bueno: si respondiéramos
    // distinto, cualquiera podría averiguar qué direcciones tienen cuenta. Pero
    // queda anotado del lado del servidor, porque hasta ahora este camino era
    // indistinguible de un envío exitoso incluso para nosotros, y es
    // exactamente el que hay que mirar cuando alguien dice "no me llega nada".
    console.warn('[reset-password] sin cuenta para ese email; no se envía nada')
    return NextResponse.json({ ok: true })
  }

  const user = users[0]

  // Throttle por email. Se mira created_at y no el vencimiento: los tokens de
  // invitación duran una semana, y la cuenta vieja —deducir la creación restando
  // el TTL de 30 minutos— daba un número absurdamente negativo. O sea que quien
  // tuviera una invitación pendiente y pidiera un reset se quedaba esperando un
  // mail que nunca salía, sin ningún error a la vista.
  const { data: previos } = await supabase
    .from('fno_password_resets')
    .select('created_at, expires_at, used')
    .eq('email', emailNorm)
    // Ordenado a propósito: sin esto, si alguna vez quedara más de una fila
    // para el mismo email, "la primera" sería la que quisiera Postgres y el
    // freno miraría un pedido cualquiera en vez del último.
    .order('created_at', { ascending: false })
    .limit(1)

  const previo = previos?.[0]
  if (previo && !previo.used) {
    const creado = previo.created_at
      ? new Date(previo.created_at).getTime()
      : new Date(previo.expires_at).getTime() - TOKEN_TTL_MS // filas viejas sin created_at
    if (Date.now() - creado < REENVIO_MIN_MS) {
      // Antes acá se devolvía ok:true para no delatar que hubo freno. El
      // efecto era el peor posible: la pantalla decía "¡Email enviado!" y no
      // se mandaba nada, así que alguien que no recibió el primero y probaba
      // de nuevo enseguida quedaba en un bucle mudo. Se lo decimos: el dato
      // que se filtra es el mismo que ya filtra un envío fallido, y esto es
      // lo que desbloquea a la persona.
      return NextResponse.json(
        {
          ok: false,
          error: 'Ya te enviamos un link recién. Revisá tu casilla y la carpeta de spam; si no llegó, esperá un minuto y volvé a intentar.',
        },
        { status: 429 },
      )
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
    // Explícito: en un upsert que actualiza una fila existente, el default de
    // la columna no vuelve a aplicarse, y el throttle mira este campo.
    created_at: new Date().toISOString(),
  })

  // Enviar email.
  //
  // Antes esto era un fetch con .catch(() => null) y un ok:true fijo. Dos
  // agujeros: .catch sólo atrapa fallos de red —un 401 de /api/notify es una
  // respuesta normal y pasaba de largo— y el ok:true se devolvía igual hubiera
  // salido el mail o no. La pantalla decía "¡Email enviado!" siempre, así que
  // un problema de envío era invisible: la persona esperaba un mail que no
  // existía y nadie se enteraba de que había algo roto.
  let enviado = false
  try {
    const res = await fetch(`${PORTAL_URL}/api/notify`, {
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
    })
    const cuerpo = await res.json().catch(() => ({}))
    enviado = res.ok && cuerpo?.ok !== false
    if (!enviado) {
      console.error('[reset-password] notify falló:', res.status, JSON.stringify(cuerpo))
    }
  } catch (err) {
    console.error('[reset-password] notify:', err)
  }

  // Decir la verdad cuando el envío falla tiene un costo: como al email
  // desconocido se le contesta ok:true sin intentar nada, un error de envío
  // revela que esa dirección existe. Con 31 empleados y casillas
  // institucionales que ya son públicas, ese dato no vale nada; mentirle a
  // alguien que está esperando poder entrar, sí.
  if (!enviado) {
    return NextResponse.json(
      { ok: false, error: 'No pudimos enviar el email. Probá de nuevo en unos minutos o escribile a RRHH.' },
      { status: 502 },
    )
  }

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
