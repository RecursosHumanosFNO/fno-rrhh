import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// Bucket PRIVADO. Las fotos de los registros internos documentan sanciones,
// accidentes y conflictos: iban a fno-media, que es público, con nombre
// Date.now() — o sea adivinable barriendo las horas laborales del día que
// figura en el registro, sin cuenta y sin dejar rastro. Y la URL además viajaba
// por email. Ahora funcionan como los recibos: bucket privado y URL firmada
// corta, sólo para quien maneja RRHH.
const BUCKET = 'fno-registros'
const TTL_SEGUNDOS = 600

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
const MAX_BYTES = 8 * 1024 * 1024

async function autorizar(req: NextRequest) {
  const sb = serviceClient()
  if (!sb) return { error: NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 }) }

  const requester = await getRequester(req, sb)
  if (!requester) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  // La bitácora interna es de Gestión de Personal; un empleado no la ve.
  if (!esGestionPersonal(requester)) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { sb }
}

// POST /api/registro-foto — sube la foto (FormData con `file`) y devuelve su
// path. Sube el server y no el navegador para no tener que abrirle a la anon
// key ningún permiso de escritura sobre un bucket privado.
export async function POST(req: NextRequest) {
  try {
    const auth = await autorizar(req)
    if (auth.error) return auth.error
    const sb = auth.sb!

    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
    }
    if (!TIPOS_PERMITIDOS.has(file.type)) {
      return NextResponse.json({ error: 'Formato no admitido' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen supera los 8 MB' }, { status: 400 })
    }

    // El nombre lleva un componente aleatorio: con sólo el timestamp, conocer la
    // fecha del registro alcanzaba para encontrar el archivo a fuerza de probar.
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `registros/${Date.now()}-${crypto.randomUUID()}.${ext || 'jpg'}`

    const { error } = await sb.storage.from(BUCKET).upload(path, file, {
      contentType: file.type, upsert: false,
    })
    if (error) {
      console.error('[registro-foto] upload:', error.message)
      return NextResponse.json({ error: 'No se pudo subir la imagen' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, path })
  } catch (err) {
    console.error('[registro-foto] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET /api/registro-foto?path=… — URL firmada por diez minutos.
export async function GET(req: NextRequest) {
  try {
    const auth = await autorizar(req)
    if (auth.error) return auth.error
    const sb = auth.sb!

    const path = req.nextUrl.searchParams.get('path')
    // Sin `..`: el path viene del cliente y termina en una operación de Storage.
    if (!path || path.includes('..')) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 })
    }

    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, TTL_SEGUNDOS)
    if (error || !data?.signedUrl) {
      console.error('[registro-foto] signed url:', error?.message)
      return NextResponse.json({ error: 'No se pudo generar el link' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error('[registro-foto] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/registro-foto?path=… — borra la imagen del bucket.
export async function DELETE(req: NextRequest) {
  try {
    const auth = await autorizar(req)
    if (auth.error) return auth.error
    const sb = auth.sb!

    const path = req.nextUrl.searchParams.get('path')
    if (!path || path.includes('..')) {
      return NextResponse.json({ error: 'Path inválido' }, { status: 400 })
    }

    const { error } = await sb.storage.from(BUCKET).remove([path])
    if (error) console.error('[registro-foto] remove:', error.message)

    return NextResponse.json({ ok: !error })
  } catch (err) {
    console.error('[registro-foto] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
