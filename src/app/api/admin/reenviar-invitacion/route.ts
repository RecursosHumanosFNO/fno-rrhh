import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'
import { enviarInvitacionAcceso } from '@/lib/invitacionAcceso'

export const runtime = 'nodejs'

// POST /api/admin/reenviar-invitacion  { empleadoId }
//
// Reenvía el link para crear la contraseña a alguien que YA tiene cuenta.
//
// Existe porque faltaba justo el caso más común: la persona a la que se le
// aprobó el acceso, nunca entró, y el mail original se le perdió o se le venció.
// Para esa persona RRHH sólo tenía el botón de "reset", que manda un link de 30
// minutos y habla de restablecer una contraseña que nunca existió. Encima la
// pantalla decía "vale por 7 días", así que se le prometía una semana y el link
// moría en media hora.
//
// Esto manda la misma invitación que sale al crear la cuenta: siete días y un
// texto que habla de crear, no de restablecer.
export async function POST(req: NextRequest) {
  try {
    const { empleadoId } = await req.json().catch(() => ({}))
    if (!empleadoId) {
      return NextResponse.json({ ok: false, error: 'Falta el empleado' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ ok: false, error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    if (!esGestionPersonal(requester)) {
      return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status: 403 })
    }

    // El email sale de la base y no del cuerpo del pedido: si viniera del
    // cliente, quien maneje RRHH podría mandar el link de acceso de un empleado
    // a una casilla suya y entrar con su cuenta.
    const { data: cuenta } = await sb
      .from('fno_users')
      .select('email')
      .eq('empleado_id', empleadoId)
      .maybeSingle()

    if (!cuenta?.email) {
      return NextResponse.json(
        { ok: false, error: 'Este empleado todavía no tiene cuenta de acceso.' },
        { status: 404 },
      )
    }

    const { data: emp } = await sb
      .from('fno_empleados')
      .select('nombre')
      .eq('id', empleadoId)
      .maybeSingle()

    const enviado = await enviarInvitacionAcceso(sb, {
      email: cuenta.email as string,
      nombre: (emp?.nombre as string) ?? 'Hola',
    })

    if (!enviado) {
      return NextResponse.json(
        { ok: false, error: 'No se pudo enviar el mail. Probá de nuevo en unos minutos.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, email: cuenta.email })
  } catch (err) {
    console.error('[reenviar-invitacion]', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
