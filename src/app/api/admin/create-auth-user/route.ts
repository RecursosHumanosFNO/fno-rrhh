import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// Roles que puede otorgar cada quien al crear una cuenta.
//
// El rol venía en el body y se insertaba tal cual, sin validar, detrás de un
// permiso que incluye a 'rrhh'. Es decir: un usuario de Gestión de Personal
// podía crear un empleado, después crearle la cuenta con role: 'admin' y una
// contraseña elegida por él, y entrar con ella. Eso saltea justamente lo que
// 'rrhh' no puede hacer (set-role, recibos de sueldo, borrado de cuentas).
//
// Otorgar 'admin' o 'rrhh' queda sólo para un admin, igual que en set-role.
const ROLES_VALIDOS = ['admin', 'employee', 'comunicaciones', 'rrhh'] as const
const ROLES_QUE_PUEDE_DAR_RRHH = ['employee', 'comunicaciones']

// POST /api/admin/create-auth-user
// Crea un usuario en Supabase Auth y su registro en fno_users.
// El requester se valida por JWT.
export async function POST(req: NextRequest) {
  try {
    const { email, password, userId, empleadoId, role } = await req.json().catch(() => ({}))

    if (!email || !userId || !empleadoId || !role) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
    if (!ROLES_VALIDOS.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // Si no llega password (fue removido del sync de Supabase por seguridad),
    // generamos una contraseña temporal fuerte. El usuario deberá usar
    // "Olvidé mi contraseña" para acceder la primera vez.
    const effectivePassword = password || crypto.randomUUID().replace(/-/g, '') + 'Aa1!'

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!esGestionPersonal(requester)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    if (requester.role !== 'admin' && !ROLES_QUE_PUEDE_DAR_RRHH.includes(role)) {
      return NextResponse.json({ error: 'Solo un administrador puede otorgar ese rol' }, { status: 403 })
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
