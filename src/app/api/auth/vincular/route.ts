import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/auth/vincular
//
// Ata una sesión recién creada con Google a la cuenta que la persona ya tiene
// en el portal.
//
// Hace falta porque el portal identifica a cada uno por su id de Supabase Auth
// (fno_users.auth_id), y al entrar por Google Supabase puede crear un id nuevo
// para la misma persona. Sin esto, alguien con cuenta y todo entraría a un
// portal que no lo reconoce: sin rol, sin legajo y sin nada que ver.
//
// Reglas, en orden de importancia:
//
//  - NO crea cuentas. Si el email no corresponde a una cuenta que RRHH ya
//    aprobó, se rechaza. Entrar con Google no es una puerta de alta: es otra
//    llave para la misma puerta.
//  - El email sale del token que emitió Supabase, nunca del cuerpo del pedido.
//  - Se exige que el proveedor lo haya verificado. Sin eso, cualquiera podría
//    registrarse en un proveedor cualquiera declarando el mail de un empleado
//    y quedarse con su legajo.
//  - Un empleado dado de baja no se vincula, igual que no puede operar.
export async function POST(req: NextRequest) {
  try {
    const sb = serviceClient()
    if (!sb) return NextResponse.json({ ok: false, error: 'Servidor no configurado' }, { status: 503 })

    const auth = req.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null
    if (!token) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })

    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 401 })
    }

    const email = (user.email ?? '').toLowerCase().trim()
    if (!email) {
      return NextResponse.json({ ok: false, error: 'La cuenta no tiene email' }, { status: 400 })
    }

    // Google marca email_verified en el identity; Supabase lo copia al user.
    const verificado = user.email_confirmed_at != null
      || (user.user_metadata as Record<string, unknown> | null)?.email_verified === true
    if (!verificado) {
      return NextResponse.json(
        { ok: false, motivo: 'sin-verificar', error: 'Tu proveedor no confirmó el correo.' },
        { status: 403 },
      )
    }

    // ilike y no eq: el email guardado puede tener mayúsculas y para las
    // personas eso es la misma dirección. Los comodines van escapados para que
    // un guion bajo no matchee la cuenta de otro.
    const patron = email.replace(/[\\%_]/g, c => `\\${c}`)
    const { data: cuenta } = await sb
      .from('fno_users')
      .select('id, auth_id, empleado_id')
      .ilike('email', patron)
      .maybeSingle()

    if (!cuenta) {
      // No es un rechazo definitivo: es alguien que entró con Google y todavía
      // no pidió el acceso, o lo pidió y RRHH no lo aprobó. El cliente los
      // manda al formulario de datos en vez de echarlos, así que hace falta
      // distinguirlos de una cuenta desactivada.
      const { data: pendiente } = await sb
        .from('fno_pending')
        .select('id')
        .ilike('email', patron)
        .maybeSingle()

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      return NextResponse.json({
        ok: false,
        motivo: pendiente ? 'pendiente' : 'sin-cuenta',
        email,
        // Lo que Google ya sabe, para no hacerle escribir el nombre de nuevo.
        nombre: typeof meta.given_name === 'string' ? meta.given_name : '',
        apellido: typeof meta.family_name === 'string' ? meta.family_name : '',
      })
    }

    if (cuenta.empleado_id) {
      const { data: emp } = await sb
        .from('fno_empleados')
        .select('estado')
        .eq('id', cuenta.empleado_id)
        .maybeSingle()
      if (emp?.estado === 'inactivo') {
        return NextResponse.json(
          { ok: false, motivo: 'inactivo', error: 'Tu cuenta está desactivada. Comunicate con RRHH.' },
          { status: 403 },
        )
      }
    }

    // Ya estaba atada a esta misma sesión: no hay nada que hacer.
    if (cuenta.auth_id === user.id) return NextResponse.json({ ok: true, vinculado: false })

    const { error: errUpd } = await sb
      .from('fno_users')
      .update({ auth_id: user.id })
      .eq('id', cuenta.id)

    if (errUpd) {
      console.error('[vincular] update:', errUpd.message)
      return NextResponse.json({ ok: false, error: 'No se pudo vincular la cuenta' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, vinculado: true })
  } catch (err) {
    console.error('[vincular]', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
