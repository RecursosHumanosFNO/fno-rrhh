import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/admin/create-auth-user
// Crea un usuario en Supabase Auth y su registro en fno_users
// Solo lo puede llamar un admin verificado (requesterId debe ser admin en DB)
export async function POST(req: NextRequest) {
  try {
    const { email, password, userId, empleadoId, role, requesterId } = await req.json()

    if (!email || !userId || !empleadoId || !role || !requesterId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Si no llega password (fue removido del sync de Supabase por seguridad),
    // generamos una contraseña temporal fuerte. El usuario deberá usar
    // "Olvidé mi contraseña" para acceder la primera vez.
    const effectivePassword = password || crypto.randomUUID().replace(/-/g, '') + 'Aa1!'

    const sb = getSupabase()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    // Verificar que quien hace el request es admin en la DB
    // 1er intento: lookup por auth_id (flujo normal)
    let { data: requester } = await sb
      .from('fno_users')
      .select('role')
      .eq('auth_id', requesterId)
      .maybeSingle()

    // Fallback: auth_id puede no estar seteado en cuentas legacy →
    // verificar usando el email que devuelve Supabase Auth
    if (!requester && requesterId) {
      const { data: authUser } = await sb.auth.admin.getUserById(requesterId)
      if (authUser?.user?.email) {
        const { data: byEmail } = await sb
          .from('fno_users').select('role').eq('email', authUser.user.email).maybeSingle()
        requester = byEmail
        // Aprovechar para setear el auth_id que faltaba
        if (byEmail) {
          await sb.from('fno_users').update({ auth_id: requesterId }).eq('email', authUser.user.email)
        }
      }
    }

    if (requester?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // 1. Crear usuario en Supabase Auth (contraseña encriptada automáticamente)
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: effectivePassword,
      email_confirm: true, // No requiere confirmación por email — el admin ya aprobó
    })

    if (authErr || !authData.user) {
      console.error('[create-auth-user] auth error:', authErr?.message)
      return NextResponse.json({ error: authErr?.message ?? 'Error al crear usuario' }, { status: 400 })
    }

    // 2. Insertar en fno_users vinculando el auth_id
    const { error: dbErr } = await sb.from('fno_users').insert({
      id: userId,
      email: email.toLowerCase().trim(),
      role,
      empleado_id: empleadoId,
      auth_id: authData.user.id,
      // password queda vacío: Supabase Auth lo maneja de forma segura
      password: '',
    })

    if (dbErr) {
      console.error('[create-auth-user] db error:', dbErr.message)
      // Revertir: eliminar el auth user creado
      await sb.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Error al crear perfil de usuario' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, authId: authData.user.id })
  } catch (err) {
    console.error('[create-auth-user] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
