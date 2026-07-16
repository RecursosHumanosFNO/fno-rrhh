import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// El empleadoId se toma del JWT (no del body), así nadie puede asociar el endpoint
// de su dispositivo a otro empleado ni manipular suscripciones ajenas.
export async function POST(req: NextRequest) {
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

  const requester = await getRequester(req, supabase)
  if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { subscription } = await req.json().catch(() => ({}))
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  await supabase
    .from('fno_push_subscriptions')
    .upsert(
      { empleado_id: requester.empleadoId, endpoint: subscription.endpoint, subscription },
      { onConflict: 'endpoint' },
    )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

  const requester = await getRequester(req, supabase)
  if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { endpoint } = await req.json().catch(() => ({}))
  if (!endpoint) return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 })

  // Solo puede borrar una suscripción propia
  await supabase.from('fno_push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('empleado_id', requester.empleadoId)

  return NextResponse.json({ ok: true })
}
