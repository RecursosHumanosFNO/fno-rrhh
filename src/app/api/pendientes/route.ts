import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// GET /api/pendientes — solicitudes de acceso todavía sin aprobar.
//
// Antes esta lista se bajaba en el sync general con la anon key, y el sync corre
// en DataProvider, que está POR ENCIMA de AuthProvider: o sea, también en /login
// y /registro, sin ninguna sesión. Cualquiera con la anon key —que es pública
// por definición, viaja en el bundle— podía leer nombre, apellido, DNI, email,
// teléfono, sector y cargo de todos los que se habían registrado.
//
// Ahora la pide el cliente igual, pero el rol se mira acá, en el JWT: quien no
// maneja RRHH recibe una lista vacía y no se entera de nada.
export async function GET(req: NextRequest) {
  try {
    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    // Sin sesión o sin permiso no es un error: es una lista vacía. Así el sync
    // del login sigue funcionando igual que siempre.
    if (!esGestionPersonal(requester)) return NextResponse.json([])

    const { data, error } = await sb
      .from('fno_pending')
      .select('id, nombre, apellido, dni, email, sector, cargo, telefono, fecha_solicitud')
    if (error) {
      console.error('[pendientes]', error.message)
      return NextResponse.json({ error: 'No se pudo leer la lista' }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[pendientes]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/pendientes — ¿este email tiene una solicitud esperando aprobación?
//
// Es lo único que necesita el login para poder decir "tu solicitud está
// pendiente" en vez de "contraseña incorrecta", que sería mentira: quien se
// registró y espera aprobación todavía no tiene cuenta con la que autenticarse.
// Devuelve un booleano y nada más — ni el nombre, ni el DNI, ni si el email
// existe como empleado.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}))
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ pendiente: false })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ pendiente: false })

    const { data } = await sb
      .from('fno_pending')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    return NextResponse.json({ pendiente: !!data })
  } catch {
    return NextResponse.json({ pendiente: false })
  }
}
