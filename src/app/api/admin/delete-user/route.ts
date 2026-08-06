import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/admin/delete-user
// Body: { empleadoId: string }
// Elimina por completo a un empleado: cuenta de login (Supabase Auth) +
// fila en fno_users + fila en fno_empleados. El requester se valida por JWT.
// Solo lo puede hacer un admin.
export async function POST(req: NextRequest) {
  try {
    const { empleadoId } = await req.json().catch(() => ({}))

    if (!empleadoId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (requester.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    if (empleadoId === requester.empleadoId) {
      return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 })
    }

    // Buscar el auth_id del empleado a eliminar
    const { data: targetUser } = await sb
      .from('fno_users')
      .select('id, auth_id')
      .eq('empleado_id', empleadoId)
      .maybeSingle()

    // 1. Eliminar la cuenta de login en Supabase Auth (si existe)
    if (targetUser?.auth_id) {
      const { error: authErr } = await sb.auth.admin.deleteUser(targetUser.auth_id as string)
      if (authErr) console.error('[delete-user] auth:', authErr.message)
    }

    // 2. Borrar los archivos del empleado en Storage.
    //
    // Antes esta ruta borraba fno_users y fno_empleados y nada más, así que un
    // empleado "eliminado" dejaba atrás sus recibos de sueldo —filas Y PDFs—,
    // firmas, solicitudes, tickets, notificaciones y fotos. Es basura que se
    // acumula, pero sobre todo es que "borré al empleado" no borraba sus datos
    // salariales.
    //
    // Los recibos viven en fno-recibos bajo {empleadoId}/ y las fotos en
    // fno-media bajo fotos/{empleadoId}/. Storage no borra por prefijo: hay que
    // listar y pasar las rutas.
    for (const [bucket, prefijo] of [['fno-recibos', empleadoId], ['fno-media', `fotos/${empleadoId}`]]) {
      const { data: archivos, error: listErr } = await sb.storage.from(bucket).list(prefijo)
      if (listErr) { console.error(`[delete-user] list ${bucket}:`, listErr.message); continue }
      if (!archivos?.length) continue
      const rutas = archivos.map(a => `${prefijo}/${a.name}`)
      const { error: rmErr } = await sb.storage.from(bucket).remove(rutas)
      if (rmErr) console.error(`[delete-user] remove ${bucket}:`, rmErr.message)
    }

    // 3. Eliminar las filas asociadas antes que el empleado.
    //
    // Los registros de novedad NO se borran: son la bitácora interna (sanciones,
    // accidentes, conflictos) y su valor está justamente en sobrevivir a la baja
    // de la persona. Se les suelta el empleado_id y queda empleado_nombre, que
    // ya se guarda desnormalizado.
    const { error: desvincularErr } = await sb.from('fno_registros_novedad')
      .update({ empleado_id: null }).eq('empleado_id', empleadoId)
    if (desvincularErr) console.error('[delete-user] registros_novedad:', desvincularErr.message)

    const enCascada = [
      'fno_recibo_firmas', 'fno_recibos', 'fno_solicitudes',
      'fno_tickets', 'fno_notifs', 'fno_push_subscriptions',
    ]
    for (const tabla of enCascada) {
      const { error } = await sb.from(tabla).delete().eq('empleado_id', empleadoId)
      // No se aborta: si una tabla falla, conviene igual terminar de borrar el
      // resto y no dejar al empleado a medio eliminar.
      if (error) console.error(`[delete-user] ${tabla}:`, error.message)
    }

    await sb.from('fno_users').delete().eq('empleado_id', empleadoId)
    await sb.from('fno_empleados').delete().eq('id', empleadoId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[delete-user] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
