import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { formatFecha } from '@/lib/utils'
import { textoRepeticion } from '@/lib/recurrencia'
import type { Canal, Evento, Novedad } from '@/types'
import { mapSupabaseToEvento, mapSupabaseToNovedad } from '@/contexts/mappers'

export const runtime = 'nodejs'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portalfno.com'
const LARGO_PUSH = 140

// GET /api/cron/publicar-programados
//
// Publica las novedades y los eventos cuya hora programada ya pasó: les borra
// publicar_en (con eso pasan a verse: la policy de RLS mira esa misma columna) y
// recién ahí manda los avisos que había elegido quien los cargó.
//
// Lo llama GitHub Actions cada quince minutos. No es un cron de Vercel porque el
// plan Hobby permite una sola corrida por día, y "publicar a las 8:00" con eso
// no se puede.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 401 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
  }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const ahora = new Date().toISOString()
  const resultado = { novedades: 0, eventos: 0, errores: [] as string[] }

  // ── Novedades ─────────────────────────────────────────────────────────────
  const { data: novRows, error: novErr } = await sb
    .from('fno_novedades')
    .select('*')
    .not('publicar_en', 'is', null)
    .lte('publicar_en', ahora)
  if (novErr) resultado.errores.push(`novedades: ${novErr.message}`)

  for (const row of novRows ?? []) {
    const nov = mapSupabaseToNovedad(row as Record<string, unknown>)
    // Primero se publica y después se avisa: si el aviso falla, la novedad ya
    // está visible. Al revés, un fallo acá dejaría avisos de algo que nadie ve.
    const { error } = await sb
      .from('fno_novedades')
      .update({ publicar_en: null, aviso_canales: null })
      .eq('id', nov.id)
      .not('publicar_en', 'is', null) // si otra corrida se adelantó, no avisa dos veces
      .select('id')
      .maybeSingle()

    if (error) { resultado.errores.push(`novedad ${nov.id}: ${error.message}`); continue }
    resultado.novedades++

    await avisar(sb, cronSecret, {
      canales: nov.avisoCanales ?? [],
      destinatarios: nov.destinatarios ?? [],
      textoApp: `Nueva novedad publicada: ${nov.titulo}`,
      pushTitulo: nov.titulo,
      pushCuerpo: recortar(nov.contenido),
      url: '/dashboard/comunicaciones',
      emailType: 'novedad_publicada',
      emailData: emails => ({
        titulo: nov.titulo, contenido: nov.contenido, autor: nov.autor,
        imagen: nov.imagen ?? '', emails: emails.join(','),
      }),
    })
  }

  // ── Eventos ───────────────────────────────────────────────────────────────
  const { data: evRows, error: evErr } = await sb
    .from('fno_eventos')
    .select('*')
    .not('publicar_en', 'is', null)
    .lte('publicar_en', ahora)
  if (evErr) resultado.errores.push(`eventos: ${evErr.message}`)

  for (const row of evRows ?? []) {
    const ev = mapSupabaseToEvento(row as Record<string, unknown>)
    const { error } = await sb
      .from('fno_eventos')
      .update({ publicar_en: null, aviso_canales: null })
      .eq('id', ev.id)
      .not('publicar_en', 'is', null)
      .select('id')
      .maybeSingle()

    if (error) { resultado.errores.push(`evento ${ev.id}: ${error.message}`); continue }
    resultado.eventos++

    await avisar(sb, cronSecret, {
      canales: ev.avisoCanales ?? [],
      destinatarios: ev.destinatarios ?? [],
      textoApp: `📅 Nuevo evento: ${ev.titulo} · ${formatFecha(ev.fecha)}${ev.hora ? `, ${ev.hora}` : ''}`,
      pushTitulo: ev.titulo,
      pushCuerpo: recortar([
        `📅 ${formatFecha(ev.fecha)}${ev.hora ? `, ${ev.hora}` : ''}`,
        ev.descripcion,
      ].filter(Boolean).join(' — ')),
      url: `/dashboard/eventos?ev=${ev.id}`,
      emailType: 'evento_notificacion',
      emailData: emails => ({
        emails: emails.join(','),
        titulo: ev.titulo, descripcion: ev.descripcion ?? '',
        fecha: formatFecha(ev.fecha), hora: ev.hora ?? '', imagen: ev.imagen ?? '',
        repeticion: textoRepeticion(ev) ?? '',
        eventoId: ev.id,
        esEdicion: '',
      }),
    })
  }

  return NextResponse.json({ ok: true, ...resultado })
}

function recortar(texto: string): string {
  const limpio = (texto ?? '').replace(/\s+/g, ' ').trim()
  if (limpio.length <= LARGO_PUSH) return limpio
  const cortado = limpio.slice(0, LARGO_PUSH)
  const ultimoEspacio = cortado.lastIndexOf(' ')
  return (ultimoEspacio > LARGO_PUSH * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado) + '…'
}

/**
 * Reparte el aviso por los canales elegidos. Es la versión server del hook
 * useAviso: acá no hay sesión de nadie, así que la notificación se inserta
 * directo y la push y el mail se piden con el secreto interno.
 */
async function avisar(sb: SupabaseClient, cronSecret: string, o: {
  canales: Canal[]
  destinatarios: string[]
  textoApp: string
  pushTitulo: string
  pushCuerpo: string
  url: string
  emailType: string
  emailData: (emails: string[]) => Record<string, string>
}) {
  if (o.canales.length === 0) return

  if (o.canales.includes('app')) {
    const comun = {
      texto: o.textoApp.slice(0, 500),
      leida: false,
      fecha: new Date().toISOString(),
      tipo: 'novedad',
      solo_admin: false,
      url: o.url,
    }
    const filas = o.destinatarios.length > 0
      ? o.destinatarios.map(empleadoId => ({
          ...comun, id: crypto.randomUUID(), empleado_id: empleadoId, solo_empleado: true,
        }))
      : [{ ...comun, id: crypto.randomUUID(), empleado_id: '', solo_empleado: false }]

    const { error } = await sb.from('fno_notifs').insert(filas)
    if (error) console.error('[publicar-programados] notifs:', error.message)

    await fetch(`${PORTAL_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': cronSecret },
      body: JSON.stringify({
        title: o.pushTitulo, body: o.pushCuerpo, url: o.url,
        empleadoIds: o.destinatarios,
      }),
    }).catch(err => console.error('[publicar-programados] push:', err))
  }

  if (o.canales.includes('email')) {
    // Los emails salen de la base: el cron no recibe la lista del cliente.
    const q = sb.from('fno_empleados').select('id, email')
    const { data } = o.destinatarios.length > 0
      ? await q.in('id', o.destinatarios)
      : await q.eq('estado', 'activo')

    const emails = (data ?? []).map(e => e.email as string).filter(Boolean)
    if (emails.length > 0) {
      await fetch(`${PORTAL_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': cronSecret },
        body: JSON.stringify({ type: o.emailType, data: o.emailData(emails) }),
      }).catch(err => console.error('[publicar-programados] mail:', err))
    }
  }
}
