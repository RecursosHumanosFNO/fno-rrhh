import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { serviceClient, getRequester } from '@/lib/serverAuth'
import { esDestinoPushValido, DESTINO_PUSH_POR_DEFECTO } from '@/lib/destinosPush'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

  // Verificar que el solicitante sea admin/comunicaciones — SIEMPRE (validado por JWT).
  // Antes el chequeo solo corría si venía un header; omitirlo saltaba la autorización.
  const requester = await getRequester(req, supabase)
  if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (requester.role !== 'admin' && requester.role !== 'comunicaciones') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  webpush.setVapidDetails(
    `mailto:${process.env.GMAIL_USER ?? 'rrhh@fno.org'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const { title, body, url, empleadoIds } = await req.json().catch(() => ({}))
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
    // Sólo rutas de la lista: una URL inventada abre un 404 en una pestaña
    // nueva del service worker, sin historial para volver atrás.
    url: esDestinoPushValido(url) ? url : DESTINO_PUSH_POR_DEFECTO,
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
