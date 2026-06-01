import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/keepalive
// Hace una consulta liviana a la base para resetear el contador de
// inactividad de Supabase (el plan free pausa proyectos tras 7 días).
// Lo llama un GitHub Action una vez por día.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'No configurado' }, { status: 503 })
  }

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } })
    // Consulta mínima: solo cuenta filas, no trae datos
    const { error } = await sb.from('fno_users').select('id', { count: 'exact', head: true })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
