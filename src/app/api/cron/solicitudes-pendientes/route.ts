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

function formatFecha(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const TIPO_LABEL: Record<string, string> = {
  ausencia: 'Ausencia', llegada_tarde: 'Llegada Tarde', salida_anticipada: 'Salida Anticipada',
  licencia_medica: 'Licencia Médica', licencia_estudio: 'Licencia por Estudio',
  licencia_maternidad_paternidad: 'Lic. Maternidad/Paternidad', licencia_duelo: 'Licencia por Duelo',
  vacaciones: 'Vacaciones', permiso_personal: 'Permiso Personal',
  horas_extra: 'Horas Extra', cambio_turno: 'Cambio de Turno', guardia_turno_especial: 'Guardia / Turno Especial',
  tarea_fuera_area: 'Tarea Fuera del Área', capacitacion: 'Capacitación',
  accidente_laboral: 'Accidente Laboral', suspension: 'Suspensión',
  observacion_comportamiento: 'Observación de Comportamiento', conflicto_interpersonal: 'Conflicto Interpersonal',
  entrega_documentacion: 'Entrega de Documentación', reconocimiento: 'Reconocimiento',
  pedido_administrativo: 'Pedido Administrativo', otro: 'Otro',
}

// GET /api/cron/solicitudes-pendientes — Vercel Cron, cada lunes a las 9am
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 401 })
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_PASS

  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
  if (!gmailUser || !gmailPass) return NextResponse.json({ skipped: 'Email no configurado' })

  const sb = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Umbral: solicitudes creadas hace más de 7 días
  const umbral = new Date()
  umbral.setDate(umbral.getDate() - 7)
  const umbralStr = umbral.toISOString().slice(0, 10)

  const { data: pendientes, error } = await sb
    .from('fno_solicitudes')
    .select('id, empleado_id, tipo, fecha_inicio, fecha_creacion, descripcion')
    .eq('estado', 'pendiente')
    .lte('fecha_creacion', umbralStr)
    .order('fecha_creacion', { ascending: true })

  if (error || !pendientes) {
    console.error('[cron/solicitudes-pendientes] Error:', error)
    return NextResponse.json({ error: 'Error al traer solicitudes' }, { status: 500 })
  }

  if (pendientes.length === 0) {
    return NextResponse.json({ ok: true, pendientes: 0 })
  }

  // Obtener IDs de empleados para hacer un solo fetch
  const empIds = Array.from(new Set(pendientes.map(s => s.empleado_id).filter(Boolean)))
  const { data: empleados } = await sb
    .from('fno_empleados')
    .select('id, nombre, apellido, sector')
    .in('id', empIds)

  const empMap = Object.fromEntries((empleados ?? []).map(e => [e.id, e]))

  // Obtener email del admin
  const { data: adminUsers } = await sb
    .from('fno_users')
    .select('email')
    .eq('role', 'admin')
    .limit(1)

  const adminEmail = adminUsers?.[0]?.email ?? gmailUser

  // Armar tabla HTML de pendientes
  const filas = pendientes.map(s => {
    const emp = empMap[s.empleado_id]
    const diasPendiente = Math.floor((Date.now() - new Date(s.fecha_creacion).getTime()) / 86400000)
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">
          ${emp ? `<strong>${emp.apellido}, ${emp.nombre}</strong><br><span style="color:#94a3b8;font-size:11px;">${emp.sector}</span>` : '—'}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">${TIPO_LABEL[s.tipo] ?? s.tipo}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">${formatFecha(s.fecha_inicio ?? s.fecha_creacion)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:center;">
          <span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${diasPendiente} días</span>
        </td>
      </tr>`
  }).join('')

  const html = base(`
    <h3 style="color:#1e293b;margin:0 0 8px;">⏳ Solicitudes sin resolver</h3>
    <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
      Hay <strong>${pendientes.length} solicitud${pendientes.length !== 1 ? 'es' : ''}</strong> con más de 7 días sin resolución.
      Por favor revisalas desde el portal.
    </p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">EMPLEADO</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">TIPO</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">FECHA INICIO</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">DÍAS PENDIENTE</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <a href="${PORTAL_URL}/dashboard/solicitudes" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin-top:20px;">
      Ir a Solicitudes →
    </a>
  `)

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
  await transporter.sendMail({
    from: `"Portal RRHH - FNO" <${gmailUser}>`,
    to: adminEmail,
    subject: `⏳ ${pendientes.length} solicitud${pendientes.length !== 1 ? 'es' : ''} sin resolver (>7 días)`,
    html,
  })

  return NextResponse.json({ ok: true, pendientes: pendientes.length, emailTo: adminEmail })
}
