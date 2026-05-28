import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Necesita service role para generar signed URLs en bucket privado
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/recibo-url
// Body: { path: string, empleadoId: string }
// Verifica propiedad del recibo y devuelve URL firmada válida por 10 minutos
export async function POST(req: NextRequest) {
  try {
    const { path, empleadoId } = await req.json()

    if (!path || !empleadoId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = getSupabase()
    if (!sb) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 })
    }

    // 1. Verificar si el solicitante es admin
    const { data: userRecord } = await sb
      .from('fno_users')
      .select('role')
      .eq('empleado_id', empleadoId)
      .maybeSingle()

    const isAdmin = userRecord?.role === 'admin'

    if (!isAdmin) {
      // 2. Verificar que el recibo pertenece a este empleado
      const { data: recibo } = await sb
        .from('fno_recibos')
        .select('empleado_id')
        .eq('archivo_url', path)
        .maybeSingle()

      if (!recibo) {
        return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 })
      }

      if (recibo.empleado_id !== empleadoId) {
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
