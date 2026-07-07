import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { subscription, empleadoId } = await req.json()
  if (!subscription?.endpoint || !empleadoId) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  await supabase
    .from('fno_push_subscriptions')
    .upsert(
      { empleado_id: empleadoId, endpoint: subscription.endpoint, subscription: subscription },
      { onConflict: 'endpoint' },
    )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabase()
  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 })
  await supabase.from('fno_push_subscriptions').delete().eq('endpoint', endpoint)
  return NextResponse.json({ ok: true })
}
