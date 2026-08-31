import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'
import type { MensajeSolicitud } from '@/types'

export const runtime = 'nodejs'

const MAX_LARGO = 2000
const MAX_MENSAJES = 100

// POST /api/solicitud-mensaje
// Body: { solicitudId, texto, cerrarComo?: 'aprobado' | 'rechazado' }
//
// Agrega un mensaje a la conversación de una solicitud. Va por el servidor y no
// directo a la base porque la política de UPDATE de fno_solicitudes es sólo para
// admin: sin esto el empleado no podría contestar. Y abrirle el UPDATE por RLS
// sería peor, porque esa misma política es la que hoy impide que alguien se
// auto-apruebe una licencia.
export async function POST(req: NextRequest) {
  try {
    const { solicitudId, texto, cerrarComo } = await req.json().catch(() => ({}))

    if (!solicitudId || typeof texto !== 'string' || !texto.trim()) {
      return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 })
    }
    if (cerrarComo && cerrarComo !== 'aprobado' && cerrarComo !== 'rechazado') {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: sol } = await sb
      .from('fno_solicitudes')
      .select('id, empleado_id, estado, conversacion')
      .eq('id', solicitudId)
      .maybeSingle()
    if (!sol) return NextResponse.json({ error: 'La solicitud no existe' }, { status: 404 })

    const esGestion = esGestionPersonal(requester)
    const esDueño = sol.empleado_id === requester.empleadoId
    if (!esGestion && !esDueño) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
    // Cerrar la solicitud es de RRHH; el empleado sólo puede escribir.
    if (cerrarComo && !esGestion) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const previos = Array.isArray(sol.conversacion) ? (sol.conversacion as MensajeSolicitud[]) : []
    if (previos.length >= MAX_MENSAJES) {
      return NextResponse.json({ error: 'La conversación llegó al límite' }, { status: 400 })
    }

    // El nombre se busca acá y no se acepta del cliente: es lo que se muestra
    // como autor del mensaje.
    const { data: emp } = await sb
      .from('fno_empleados')
      .select('nombre, apellido')
      .eq('id', requester.empleadoId)
      .maybeSingle()

    const mensaje: MensajeSolicitud = {
      de: esGestion ? 'rrhh' : 'empleado',
      texto: texto.trim().slice(0, MAX_LARGO),
      fecha: new Date().toISOString(),
      autor: emp ? `${emp.nombre} ${emp.apellido}`.trim() : undefined,
    }

    // Mientras la conversación sigue, la solicitud queda 'en_revision'. Si RRHH
    // manda el mensaje cerrándola, se guarda el estado final en la misma
    // operación (y el texto queda además como comentarioAdmin, que es lo que
    // muestran el PDF y el mail de resolución).
    const update: Record<string, unknown> = {
      conversacion: [...previos, mensaje],
      estado: cerrarComo ?? 'en_revision',
    }
    if (cerrarComo) {
      update.fecha_resolucion = new Date().toISOString().slice(0, 10)
      update.comentario_admin = mensaje.texto
    }

    const { error } = await sb.from('fno_solicitudes').update(update).eq('id', solicitudId)
    if (error) {
      console.error('[solicitud-mensaje]', error.message)
      return NextResponse.json({ error: 'No se pudo guardar el mensaje' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, mensaje, estado: update.estado })
  } catch (err) {
    console.error('[solicitud-mensaje]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
