import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portalfno.com'
const BRAND = '#23597e'

function base(content: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:${BRAND};padding:24px 32px;">
      <h2 style="color:#fff;margin:0;font-size:20px;">Fundación Neuquén Oeste</h2>
      <p style="color:#93c5fd;margin:4px 0 0 0;font-size:13px;">Portal de Recursos Humanos</p>
    </div>
    <div style="padding:32px;">${content}</div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
        Portal RRHH — Fundación Neuquén Oeste · <a href="${PORTAL_URL}" style="color:#3078ac;">${PORTAL_URL.replace('https://', '')}</a>
      </p>
    </div>
  </div>`
}

function btn(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin-top:20px;">${text} →</a>`
}

// Argentina es UTC-3 sin DST — devuelve "MM-DD" del día actual en Argentina
function hoyAR(): string {
  const now = new Date()
  const ar = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const mm = String(ar.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(ar.getUTCDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

// GET /api/cron/cumpleanos — lo invoca Vercel Cron todos los días a las 7am (ARG)
export async function GET(req: NextRequest) {
  // Vercel envía Authorization: Bearer {CRON_SECRET} — verificar si está configurado
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_PASS

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
  }

  const sb = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const hoy = hoyAR() // "MM-DD"

  // Traer todos los empleados activos con email y fecha de nacimiento
  const { data: empleados, error } = await sb
    .from('fno_empleados')
    .select('id, nombre, apellido, email, fecha_nacimiento')
    .eq('estado', 'activo')

  if (error || !empleados) {
    console.error('[cron/cumpleanos] Error al traer empleados:', error)
    return NextResponse.json({ error: 'Error al traer empleados' }, { status: 500 })
  }

  // Filtrar cumpleañeros de hoy
  const cumpleaneros = empleados.filter(e => {
    if (!e.fecha_nacimiento) return false
    const partes = (e.fecha_nacimiento as string).split('-') // YYYY-MM-DD
    return `${partes[1]}-${partes[2]}` === hoy
  })

  if (cumpleaneros.length === 0) {
    return NextResponse.json({ ok: true, mensaje: 'No hay cumpleaños hoy', hoy })
  }

  const transporter = (gmailUser && gmailPass)
    ? nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
    : null
  const from = `"RRHH — Fundación Neuquén Oeste" <${gmailUser}>`

  const enviados: string[] = []
  const fechaNotif = new Date().toISOString().slice(0, 10)

  for (const cumpleanero of cumpleaneros) {
    const nombre = cumpleanero.nombre as string
    const apellido = cumpleanero.apellido as string
    const email = cumpleanero.email as string | null
    const id = cumpleanero.id as string

    // ── 1. Notificación in-app al cumpleañero ────────────────────────────────
    await sb.from('fno_notifs').insert({
      id: crypto.randomUUID(),
      texto: `🎂 ¡Feliz cumpleaños, ${nombre}! Toda la Fundación Neuquén Oeste te desea un día muy especial. ¡Que lo disfrutes!`,
      tipo: 'novedad',
      leida: false,
      fecha: fechaNotif,
      empleado_id: id,
    }).then(({ error: e }) => {
      if (e) console.error('[cron/cumpleanos] notif cumpleanero:', e)
    })

    // ── 2. Email al cumpleañero ──────────────────────────────────────────────
    if (transporter && email) {
      await transporter.sendMail({
        from,
        to: email,
        subject: `🎂 ¡Feliz cumpleaños, ${nombre}!`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;font-size:22px;">🎂 ¡Feliz cumpleaños, ${nombre}!</h3>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p style="color:#64748b;line-height:1.7;">¡Hoy es tu día especial! Todo el equipo de la <strong>Fundación Neuquén Oeste</strong> te desea un feliz cumpleaños lleno de alegría.</p>
          <p style="color:#64748b;line-height:1.7;">¡Que lo pases genial! 🎉</p>
          ${btn('Ir al Portal', PORTAL_URL)}
        `),
      }).catch(e => console.error('[cron/cumpleanos] email al cumpleanero:', e))
    }

    // ── 3. Notificación in-app + email a cada otro empleado activo ───────────
    const otros = empleados.filter(e => e.id !== id)

    for (const otro of otros) {
      // Notif in-app
      await sb.from('fno_notifs').insert({
        id: crypto.randomUUID(),
        texto: `🎂 ¡Hoy es el cumpleaños de ${nombre} ${apellido}! Aprovechá para felicitarlo/a.`,
        tipo: 'novedad',
        leida: false,
        fecha: fechaNotif,
        empleado_id: otro.id as string,
      }).then(({ error: e }) => {
        if (e) console.error('[cron/cumpleanos] notif equipo:', e)
      })

      // Email (solo si tiene email)
      if (transporter && otro.email) {
        await transporter.sendMail({
          from,
          to: otro.email as string,
          subject: `🎂 ¡Hoy cumple años ${nombre}!`,
          html: base(`
            <h3 style="color:${BRAND};margin-top:0;font-size:20px;">🎂 ¡${nombre} está de cumpleaños!</h3>
            <p>Hola,</p>
            <p style="color:#64748b;line-height:1.7;">
              Hoy <strong>${nombre} ${apellido}</strong> está de cumpleaños.
              ¡Aprovechá para hacerle llegar tus felicitaciones!
            </p>
            ${btn('Ir al Portal', `${PORTAL_URL}/dashboard`)}
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">— Portal RRHH · Fundación Neuquén Oeste</p>
          `),
        }).catch(e => console.error('[cron/cumpleanos] email equipo:', e))
      }
    }

    enviados.push(`${nombre} ${apellido}`)
  }

  return NextResponse.json({ ok: true, cumpleaneros: enviados, hoy })
}
