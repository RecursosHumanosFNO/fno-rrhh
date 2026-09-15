import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/perfil
// Permite que un empleado autenticado actualice sus propios datos en fno_empleados
// (o que un admin edite cualquiera). El requester se valida por JWT.
// Usa service role key para bypassear RLS.
export async function POST(req: NextRequest) {
  try {
    const { empleadoId, data } = await req.json().catch(() => ({}))

    if (!empleadoId || !data) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    // Gestión de Personal edita fichas de otros; un empleado solo la propia.
    const esAdmin = esGestionPersonal(requester)
    if (!esAdmin && requester.empleadoId !== empleadoId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Campos que un empleado puede editar (lista blanca)
    const CAMPOS_EMPLEADO = [
      'nombre', 'apellido', 'dni', 'cuil', 'fecha_nacimiento',
      'telefono', 'direccion', 'contacto_emergencia', 'cbu', 'banco',
      'foto', 'foto_cover',
      // Sector, cargo, supervisor y fecha de ingreso NO están: los define RRHH.
      // Estaban, y con eso alguien podía auto-asignarse un cargo o adelantarse
      // la antigüedad sin que nadie lo aprobara. La jornada queda porque es
      // informativa y el empleado la carga al completar su perfil.
      'jornada',
    ]
    // En la base queda la URL de Storage, no la imagen: cualquier cosa de este
    // tamaño es basura o abuso. El tope es holgado a propósito —una foto vieja
    // guardada como data URL ronda los 150 KB— para no rechazar nada legítimo.
    const MAX_FOTO = 2 * 1024 * 1024
    for (const campo of ['foto', 'foto_cover']) {
      const v = (data as Record<string, unknown>)[campo]
      if (typeof v === 'string' && v.length > MAX_FOTO) {
        return NextResponse.json({ error: 'La imagen es demasiado grande' }, { status: 413 })
      }
    }

    // Admins pueden editar todo; empleados solo sus campos permitidos
    const update: Record<string, unknown> = {}
    if (esAdmin) {
      Object.assign(update, data)
    } else {
      for (const campo of CAMPOS_EMPLEADO) {
        if (campo in data) update[campo] = (data as Record<string, unknown>)[campo]
      }
    }
    // El id va al final y pisa lo que venga en `data`: si no, un `id` en el
    // cuerpo mandaba el upsert a otra ficha que la de la autorización. Hoy no
    // es escalada —quien llega acá con esAdmin ya puede editar a cualquiera—
    // pero deja que la fila que se escribe no sea la que se verificó.
    update.id = empleadoId

    // Estado previo: sólo interesa cuando efectivamente cambia. Un guardado
    // común de la ficha manda `estado` sin querer cambiarlo (el mapper siempre
    // lo incluye), y no hay por qué tocarle la cuenta a nadie por eso.
    const nuevoEstado = update.estado
    let estadoPrevio: string | undefined
    if (esAdmin && (nuevoEstado === 'inactivo' || nuevoEstado === 'activo')) {
      const { data: previo } = await sb
        .from('fno_empleados').select('estado').eq('id', empleadoId).maybeSingle()
      estadoPrevio = previo?.estado as string | undefined
    }

    const { error } = await sb.from('fno_empleados').upsert(update)
    if (error) {
      console.error('[perfil] upsert error:', error)
      return NextResponse.json({ error: 'No se pudieron guardar los cambios' }, { status: 500 })
    }

    // Desactivar o reactivar tiene que alcanzar también a la cuenta de login.
    // Sin esto, al desvinculado le quedaba una sesión válida de Supabase Auth:
    // las rutas de acá ya lo frenan (ver getRequester), pero con la anon key
    // podía seguir hablándole directo a la base mientras el token viviera.
    if (estadoPrevio !== undefined && estadoPrevio !== nuevoEstado) {
      const inactivo = nuevoEstado === 'inactivo'
      const { data: cuenta } = await sb
        .from('fno_users')
        .select('auth_id')
        .eq('empleado_id', empleadoId)
        .maybeSingle()

      if (cuenta?.auth_id) {
        const authId = cuenta.auth_id as string
        // ban_duration corta el refresco del token y cualquier login nuevo.
        const { error: banErr } = await sb.auth.admin.updateUserById(authId, {
          ban_duration: inactivo ? '876000h' : 'none',
        })
        if (banErr) console.error('[perfil] ban:', banErr.message)
        // Nota: el access token que ya tenga en el teléfono sigue siendo válido
        // hasta que expire (una hora). Contra las rutas de acá no le sirve
        // —getRequester lo rechaza al instante—; contra la base directa, esa
        // hora es la ventana, y no hay forma de cerrarla desde el server
        // (admin.signOut necesita el JWT del propio usuario, que no tenemos).
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[perfil]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
