import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/recibo-url
// Body: { path: string }
// El solicitante se valida por JWT. Un empleado solo puede pedir la URL de sus
// propios recibos; un admin, de cualquiera. Devuelve URL firmada por 10 minutos.
export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json().catch(() => ({}))

    if (!path) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 })
    }

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const isAdmin = requester.role === 'admin'
    const empleadoId = requester.empleadoId

    if (!isAdmin) {
      // 2a. Verificar por PATH: el path siempre empieza con {empleadoId}/
      if (!path.startsWith(`${empleadoId}/`)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
      }

      // 2b. Verificar además en la tabla que el recibo pertenece a este empleado
      const { data: recibo } = await sb
        .from('fno_recibos')
        .select('empleado_id')
        .eq('archivo_url', path)
        .maybeSingle()

      if (!recibo || recibo.empleado_id !== empleadoId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
      }
    }

    // 3. Generar URL firmada válida por 10 minutos (600 segundos)
    const { data: signedData, error: signErr } = await sb.storage
      .from('fno-recibos')
      .createSignedUrl(path, 600)

    if (signErr || !signedData?.signedUrl) {
      console.error('[recibo-url] signed URL error:', signErr?.message)
      return NextResponse.json({ error: 'No se pudo generar el link' }, { status: 500 })
    }

    return NextResponse.json({ url: signedData.signedUrl })
  } catch (err) {
    console.error('[recibo-url] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
