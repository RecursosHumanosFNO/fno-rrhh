import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'

export const runtime = 'nodejs'

const MAX_TEXTO = 500

// POST /api/notificacion — crea una notificación de la campanita.
//
// Antes las insertaba el navegador con la anon key, y la policy tenía que ser
// `with check (true)` para que funcionara: cuando un empleado carga una
// solicitud, es SU navegador el que crea el aviso dirigido a RRHH. Con eso,
// cualquiera podía inventar una notificación y meterla en la campanita de otro
// —"Tu solicitud fue aprobada", por ejemplo— o llenar la tabla.
//
// Ahora inserta el servidor y la regla es explícita:
//   · Gestión de Personal puede crear cualquiera.
//   · Un empleado, sólo avisos para RRHH (soloAdmin) o para sí mismo.
export async function POST(req: NextRequest) {
  try {
    const { notif } = await req.json().catch(() => ({}))
    if (!notif?.id || typeof notif.texto !== 'string' || !notif.texto.trim()) {
      return NextResponse.json({ error: 'Notificación inválida' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const soloAdmin = notif.soloAdmin === true
    const destino: string = notif.empleadoId ?? ''

    if (!esGestionPersonal(requester)) {
      const paraRRHH = soloAdmin && !destino
      const paraSiMismo = destino === requester.empleadoId
      if (!paraRRHH && !paraSiMismo) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
      }
    }

    const fila = {
      id: String(notif.id),
      texto: String(notif.texto).slice(0, MAX_TEXTO),
      leida: false,
      fecha: typeof notif.fecha === 'string' ? notif.fecha : new Date().toISOString(),
      tipo: String(notif.tipo ?? 'sistema'),
      empleado_id: destino,
      solo_admin: soloAdmin,
      solo_empleado: notif.soloEmpleado === true,
      url: typeof notif.url === 'string' ? notif.url : null,
    }

    const { error } = await sb.from('fno_notifs').insert(fila)
    if (error) {
      console.error('[notificacion]', error.message, error.code)
      return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notificacion]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
