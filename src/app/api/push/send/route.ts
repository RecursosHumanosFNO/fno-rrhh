import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  webpush.setVapidDetails(
    `mailto:${process.env.GMAIL_USER ?? 'rrhh@fno.org'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  // Verificar que el solicitante sea admin
  const authHeader = req.headers.get('x-empleado-id')
  if (authHeader) {
    const { data: u } = await supabase
      .from('fno_users')
      .select('role')
      .eq('empleado_id', authHeader)
      .single()
    if (!u || (u.role !== 'admin' && u.role !== 'comunicaciones')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }
  }

  const { title, body, url, empleadoIds } = await req.json()
  if (!title || !body) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  // Obtener suscripciones (todas o filtradas por empleado)
  let query = supabase.from('fno_push_subscriptions').select('subscription, empleado_id')
  if (empleadoIds && empleadoIds.length > 0) {
    query = query.in('empleado_id', empleadoIds)
  }
  const { data: subs } = await query
  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const payload = JSON.stringify({
    title,
    body,
    url: url ?? '/dashboard',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  })

  let sent = 0
  const dead: string[] = []

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload)
        sent++
      } catch (err: unknown) {
        // 410 Gone = suscripción expirada, limpiar
        if ((err as { statusCode?: number }).statusCode === 410) {
          dead.push(row.subscription.endpoint)
        }
      }
    }),
  )

  // Limpiar suscripciones muertas
  if (dead.length > 0) {
    await supabase.from('fno_push_subscriptions').delete().in('endpoint', dead)
  }

  return NextResponse.json({ ok: true, sent, dead: dead.length })
}
