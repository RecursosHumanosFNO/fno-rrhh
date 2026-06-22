import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portalfno.com'
const BRAND = '#23597e'
const DEST = 'secretariodefundacion@gmail.com'

// Argentina = UTC-3 sin DST
function ahoraAR() {
  const now = new Date()
  return new Date(now.getTime() - 3 * 60 * 60 * 1000)
}

function fechaARString(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fechaLegible(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function base(titulo: string, content: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:${BRAND};padding:24px 32px;">
      <h2 style="color:#fff;margin:0;font-size:20px;">Fundación Neuquén Oeste</h2>
      <p style="color:#93c5fd;margin:4px 0 0 0;font-size:13px;">Reporte diario — Portal de Recursos Humanos</p>
    </div>
    <div style="padding:28px 32px;">
      <h1 style="color:${BRAND};font-size:22px;margin:0 0 8px 0;">${titulo}</h1>
      <p style="color:#64748b;font-size:13px;margin:0 0 28px 0;">Resumen generado automáticamente del día anterior.</p>
      ${content}
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
        Portal RRHH — Fundación Neuquén Oeste · <a href="${PORTAL_URL}" style="color:#3078ac;">${PORTAL_URL.replace('https://', '')}</a>
      </p>
    </div>
  </div>`
}

function seccion(titulo: string, icono: string, color: string, filas: string[], vacio: string) {
  const badge = filas.length > 0
    ? `<span style="background:${color};color:#fff;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;margin-left:8px;">${filas.length}</span>`
    : ''
  const cuerpo = filas.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px;">
        ${filas.join('')}
      </table>`
    : `<p style="color:#94a3b8;font-size:13px;margin:8px 0 0 0;">${vacio}</p>`
  return `
  <div style="margin-bottom:28px;">
    <h2 style="font-size:15px;color:#1e293b;margin:0 0 4px 0;display:flex;align-items:center;">
      ${icono} ${titulo}${badge}
    </h2>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0;">
    ${cuerpo}
  </div>`
}

function fila(cols: string[], alt: boolean) {
  const bg = alt ? '#f8fafc' : '#fff'
  const tds = cols.map((c, i) =>
    `<td style="padding:8px 10px;font-size:13px;color:${i === 0 ? '#1e293b' : '#475569'};border-bottom:1px solid #f1f5f9;">${c}</td>`
  ).join('')
  return `<tr style="background:${bg};">${tds}</tr>`
}

function thead(cols: string[]) {
  const ths = cols.map(c =>
    `<th style="text-align:left;padding:8px 10px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e2e8f0;">${c}</th>`
  ).join('')
  return `<tr>${ths}</tr>`
}

function alerta(texto: string, color = '#f59e0b') {
  return `<div style="background:${color}18;border-left:4px solid ${color};padding:10px 14px;border-radius:6px;margin-bottom:10px;font-size:13px;color:#1e293b;">${texto}</div>`
}

const LABELS_SOLICITUD: Record<string, string> = {
  ausencia: 'Ausencia', llegada_tarde: 'Llegada tarde', salida_anticipada: 'Salida anticipada',
  licencia_medica: 'Lic. médica', licencia_estudio: 'Lic. estudio',
  licencia_maternidad_paternidad: 'Lic. mat./pat.', licencia_duelo: 'Lic. duelo',
  vacaciones: 'Vacaciones', permiso_personal: 'Permiso personal',
  horas_extra: 'Horas extra', cambio_turno: 'Cambio turno',
  guardia_turno_especial: 'Guardia especial', tarea_fuera_area: 'Fuera de área',
  capacitacion: 'Capacitación', accidente_laboral: 'Accidente laboral',
  suspension: 'Suspensión', observacion_comportamiento: 'Observación', conflicto_interpersonal: 'Conflicto',
  entrega_documentacion: 'Doc. entregada', reconocimiento: 'Reconocimiento',
  pedido_administrativo: 'Ped. administrativo', otro: 'Otro',
}

const LABELS_TICKET: Record<string, string> = {
  certificado_laboral: 'Certificado laboral', consulta: 'Consulta',
  actualizacion_datos: 'Act. datos', reclamo: 'Reclamo', otro: 'Otro',
}

// GET /api/cron/reporte-diario — lo invoca Vercel Cron todos los días a las 8am ARG (11:00 UTC)
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 401 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const ahora = ahoraAR()
  const hoy = fechaARString(ahora)

  // Ayer en Argentina
  const ayerDate = new Date(ahora.getTime() - 24 * 60 * 60 * 1000)
  const ayer = fechaARString(ayerDate)

  // ─── Consultas en paralelo ────────────────────────────────────────────────

  const [
    { data: empleados },
    { data: solPendientes },
    { data: solAyer },
    { data: ticketsSinRespuesta },
    { data: ticketsAyer },
    { data: recibosAyer },
    { data: firmasAyer },
    { data: novedadesAyer },
    { data: registrosAyer },
    { data: pendingRegs },
    { data: recibosEsteMes },
  ] = await Promise.all([
    sb.from('fno_empleados').select('id, nombre, apellido, sector, cargo, estado, fecha_ingreso'),
    sb.from('fno_solicitudes').select('id, empleado_id, tipo, fecha_inicio, fecha_creacion, descripcion').eq('estado', 'pendiente'),
    sb.from('fno_solicitudes').select('id, empleado_id, tipo, estado, fecha_inicio, fecha_resolucion, comentario_admin').gte('fecha_resolucion', ayer).lt('fecha_resolucion', hoy),
    sb.from('fno_tickets').select('id, empleado_id, tipo, asunto, estado, fecha_creacion').in('estado', ['abierto', 'en_proceso']),
    sb.from('fno_tickets').select('id, empleado_id, tipo, asunto, estado, respuesta, fecha_actualizacion').gte('fecha_actualizacion', ayer).lt('fecha_actualizacion', hoy),
    sb.from('fno_recibos').select('id, empleado_id, mes, anio, concepto, monto, fecha_subida').gte('fecha_subida', ayer).lt('fecha_subida', hoy),
    sb.from('fno_recibo_firmas').select('id, recibo_id, empleado_id, firmado_en').gte('firmado_en', `${ayer}T00:00:00`).lt('firmado_en', `${hoy}T00:00:00`),
    sb.from('fno_novedades').select('id, titulo, categoria, autor, fecha_publicacion').gte('fecha_publicacion', ayer).lt('fecha_publicacion', hoy),
    sb.from('fno_registros_novedad').select('id, empleado_nombre, categoria, descripcion, fecha, creado_en').gte('fecha', ayer).lt('fecha', hoy),
    sb.from('fno_pending').select('id, nombre, apellido, email, fecha_solicitud'),
    sb.from('fno_recibos').select('empleado_id, mes, anio').eq('mes', ahora.getUTCMonth() + 1).eq('anio', ahora.getUTCFullYear()),
  ])

  // Mapa id → nombre para resolver empleados
  const nombreEmp = (id: string) => {
    const e = (empleados ?? []).find((x: { id: string }) => x.id === id)
    return e ? `${(e as { nombre: string }).nombre} ${(e as { apellido: string }).apellido}` : '—'
  }

  const activos = (empleados ?? []).filter((e: { estado: string }) => e.estado === 'activo')
  const inactivos = (empleados ?? []).filter((e: { estado: string }) => e.estado === 'inactivo')
  const fuera = (empleados ?? []).filter((e: { estado: string }) => e.estado === 'licencia' || e.estado === 'vacaciones')

  // ─── Alertas ──────────────────────────────────────────────────────────────

  const alertas: string[] = []

  // Solicitudes con más de 3 días sin respuesta
  const solVencidas = (solPendientes ?? []).filter((s: { fecha_creacion: string }) => {
    const created = new Date(s.fecha_creacion)
    const diasSinResp = Math.floor((ayerDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return diasSinResp >= 3
  })
  if (solVencidas.length > 0) {
    alertas.push(alerta(`⚠️ Hay <strong>${solVencidas.length} solicitud${solVencidas.length > 1 ? 'es' : ''}</strong> sin respuesta hace 3 días o más.`, '#ef4444'))
  }

  // Tickets abiertos sin mover hace más de 2 días
  const ticketsVencidos = (ticketsSinRespuesta ?? []).filter((t: { fecha_creacion: string }) => {
    const created = new Date(t.fecha_creacion)
    const dias = Math.floor((ayerDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return dias >= 2
  })
  if (ticketsVencidos.length > 0) {
    alertas.push(alerta(`⚠️ Hay <strong>${ticketsVencidos.length} ticket${ticketsVencidos.length > 1 ? 's' : ''}</strong> abierto${ticketsVencidos.length > 1 ? 's' : ''} sin movimiento hace 2+ días.`, '#f59e0b'))
  }

  // Registros pendientes de acceso
  if ((pendingRegs ?? []).length > 0) {
    alertas.push(alerta(`🟡 Hay <strong>${(pendingRegs ?? []).length} solicitud${(pendingRegs ?? []).length > 1 ? 'es' : ''} de acceso</strong> pendiente${(pendingRegs ?? []).length > 1 ? 's' : ''} de aprobación.`, '#8b5cf6'))
  }

  // ─── Secciones del email ──────────────────────────────────────────────────

  // 1. Solicitudes pendientes sin responder
  const filassolPend = (solPendientes ?? []).map((s: { empleado_id: string; tipo: string; fecha_inicio: string; fecha_creacion: string }, i: number) => {
    const dias = Math.floor((ayerDate.getTime() - new Date(s.fecha_creacion).getTime()) / (1000 * 60 * 60 * 24))
    const diasLabel = dias === 0 ? 'Hoy' : dias === 1 ? '1 día' : `${dias} días`
    return fila([
      nombreEmp(s.empleado_id),
      LABELS_SOLICITUD[s.tipo] ?? s.tipo,
      fechaLegible(s.fecha_inicio),
      `<span style="color:${dias >= 3 ? '#ef4444' : '#f59e0b'};font-weight:600;">${diasLabel}</span>`,
    ], i % 2 === 1)
  })

  const secSolPend = seccion(
    'Solicitudes sin responder',
    '📋',
    '#ef4444',
    filassolPend.length > 0
      ? [thead(['Empleado', 'Tipo', 'Desde', 'Sin resp.']), ...filassolPend]
      : [],
    'No hay solicitudes pendientes. ✔',
  )

  // 2. Solicitudes resueltas ayer
  const filassolAyer = (solAyer ?? []).map((s: { empleado_id: string; tipo: string; estado: string; fecha_resolucion: string; comentario_admin?: string }, i: number) => fila([
    nombreEmp(s.empleado_id),
    LABELS_SOLICITUD[s.tipo] ?? s.tipo,
    s.estado === 'aprobado'
      ? '<span style="color:#22c55e;font-weight:600;">Aprobada</span>'
      : '<span style="color:#ef4444;font-weight:600;">Rechazada</span>',
    s.comentario_admin ?? '—',
  ], i % 2 === 1))

  const secSolAyer = seccion(
    'Solicitudes resueltas ayer',
    '✅',
    '#22c55e',
    filassolAyer.length > 0
      ? [thead(['Empleado', 'Tipo', 'Resolución', 'Comentario']), ...filassolAyer]
      : [],
    'No se resolvieron solicitudes ayer.',
  )

  // 3. Tickets sin respuesta
  const filasTickets = (ticketsSinRespuesta ?? []).map((t: { empleado_id: string; tipo: string; asunto: string; estado: string; fecha_creacion: string }, i: number) => {
    const dias = Math.floor((ayerDate.getTime() - new Date(t.fecha_creacion).getTime()) / (1000 * 60 * 60 * 24))
    return fila([
      nombreEmp(t.empleado_id),
      LABELS_TICKET[t.tipo] ?? t.tipo,
      t.asunto,
      t.estado === 'abierto' ? 'Abierto' : 'En proceso',
      `<span style="color:${dias >= 2 ? '#ef4444' : '#f59e0b'}">${dias === 0 ? 'Hoy' : dias + 'd'}</span>`,
    ], i % 2 === 1)
  })

  const secTickets = seccion(
    'Tickets sin respuesta',
    '🎫',
    '#f59e0b',
    filasTickets.length > 0
      ? [thead(['Empleado', 'Tipo', 'Asunto', 'Estado', 'Antigüedad']), ...filasTickets]
      : [],
    'No hay tickets pendientes. ✔',
  )

  // 4. Actividad de ayer: recibos subidos
  const filasRecibos = (recibosAyer ?? []).map((r: { empleado_id: string; mes: number; anio: number; concepto?: string; monto?: number }, i: number) => {
    const firmado = (firmasAyer ?? []).some((f: { recibo_id: string }) => f.recibo_id === r.id)
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return fila([
      nombreEmp(r.empleado_id),
      `${meses[r.mes - 1]} ${r.anio}`,
      r.concepto ?? 'Recibo mensual',
      r.monto ? `$${Number(r.monto).toLocaleString('es-AR')}` : '—',
      firmado ? '<span style="color:#22c55e;">Firmado ✔</span>' : '<span style="color:#94a3b8;">Sin firmar</span>',
    ], i % 2 === 1)
  })

  const secRecibos = seccion(
    'Recibos subidos ayer',
    '💰',
    '#6366f1',
    filasRecibos.length > 0
      ? [thead(['Empleado', 'Período', 'Concepto', 'Monto', 'Estado']), ...filasRecibos]
      : [],
    'No se subieron recibos ayer.',
  )

  // 5. Novedades publicadas ayer
  const filasNovedades = (novedadesAyer ?? []).map((n: { titulo: string; categoria: string; autor: string }, i: number) =>
    fila([n.titulo, n.categoria, n.autor], i % 2 === 1)
  )

  const secNovedades = seccion(
    'Novedades publicadas ayer',
    '📢',
    '#0ea5e9',
    filasNovedades.length > 0
      ? [thead(['Título', 'Categoría', 'Autor']), ...filasNovedades]
      : [],
    'No se publicaron novedades ayer.',
  )

  // 6. Registros internos de ayer
  const filasRegistros = (registrosAyer ?? []).map((r: { empleado_nombre: string; categoria: string; descripcion: string }, i: number) =>
    fila([r.empleado_nombre, r.categoria.replace(/_/g, ' '), r.descripcion.slice(0, 80) + (r.descripcion.length > 80 ? '…' : '')], i % 2 === 1)
  )

  const secRegistros = seccion(
    'Registros internos de ayer',
    '📝',
    '#8b5cf6',
    filasRegistros.length > 0
      ? [thead(['Empleado', 'Categoría', 'Descripción']), ...filasRegistros]
      : [],
    'No se registraron novedades internas ayer.',
  )

  // 7. Estado general del plantel
  const resumenPlantel = `
  <div style="margin-bottom:28px;">
    <h2 style="font-size:15px;color:#1e293b;margin:0 0 4px 0;">👥 Estado del plantel</h2>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0;">
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;">
      ${[
        ['Activos', activos.length, '#22c55e'],
        ['Inactivos', inactivos.length, '#94a3b8'],
        ['Fuera (lic./vac.)', fuera.length, '#f59e0b'],
        ['Total', (empleados ?? []).length, BRAND],
      ].map(([label, val, color]) =>
        `<div style="background:#f8fafc;border-radius:8px;padding:12px 18px;text-align:center;min-width:100px;border:1px solid #e2e8f0;">
          <div style="font-size:24px;font-weight:700;color:${color};">${val}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${label}</div>
        </div>`
      ).join('')}
    </div>
  </div>`

  // 8. Empleados activos sin recibo del mes actual
  const mesActual = ahora.getUTCMonth() + 1
  const anioActual = ahora.getUTCFullYear()
  const idsConRecibo = new Set((recibosEsteMes ?? []).map((r: { empleado_id: string }) => r.empleado_id))
  const sinRecibo = activos.filter((e: { id: string }) => !idsConRecibo.has(e.id))

  const filasSinRecibo = sinRecibo.map((e: { nombre: string; apellido: string; sector: string; cargo: string }, i: number) =>
    fila([`${e.nombre} ${e.apellido}`, e.sector ?? '—', e.cargo ?? '—'], i % 2 === 1)
  )

  const mesesLabel = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const secSinRecibo = seccion(
    `Sin recibo de ${mesesLabel[mesActual - 1]} ${anioActual}`,
    '🧾',
    '#ef4444',
    filasSinRecibo.length > 0
      ? [thead(['Empleado', 'Sector', 'Cargo']), ...filasSinRecibo]
      : [],
    `Todos los empleados activos tienen recibo de ${mesesLabel[mesActual - 1]}. ✔`,
  )

  if (sinRecibo.length > 0) {
    alertas.push(alerta(`🧾 <strong>${sinRecibo.length} empleado${sinRecibo.length > 1 ? 's' : ''} activo${sinRecibo.length > 1 ? 's' : ''}</strong> no tiene${sinRecibo.length > 1 ? 'n' : ''} recibo de ${mesesLabel[mesActual - 1]} ${anioActual}.`, '#ef4444'))
  }

  // 10. Accesos pendientes
  const secPending = (pendingRegs ?? []).length > 0
    ? seccion(
        'Accesos pendientes de aprobación',
        '🟡',
        '#8b5cf6',
        [thead(['Nombre', 'Email', 'Solicitud']),
          ...(pendingRegs ?? []).map((p: { nombre: string; apellido: string; email: string; fecha_solicitud: string }, i: number) =>
            fila([`${p.nombre} ${p.apellido}`, p.email, fechaLegible(p.fecha_solicitud)], i % 2 === 1)
          )],
        '',
      )
    : ''

  // ─── Armar HTML del email ─────────────────────────────────────────────────

  const alertasHtml = alertas.length > 0
    ? `<div style="margin-bottom:28px;"><h2 style="font-size:15px;color:#1e293b;margin:0 0 8px 0;">🔔 Alertas</h2><hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 12px 0;">${alertas.join('')}</div>`
    : ''

  const btnPortal = `<div style="text-align:center;margin-top:24px;"><a href="${PORTAL_URL}/dashboard" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Ir al portal →</a></div>`

  const html = base(
    `Reporte del ${fechaLegible(ayer)}`,
    alertasHtml +
    resumenPlantel +
    secSolPend +
    secSolAyer +
    secTickets +
    secRecibos +
    secNovedades +
    secRegistros +
    secSinRecibo +
    secPending +
    btnPortal,
  )

  // ─── Enviar email ─────────────────────────────────────────────────────────

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ ok: false, error: 'Gmail no configurado', html }, { status: 200 })
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  })

  const solPend = (solPendientes ?? []).length
  const tickPend = (ticketsSinRespuesta ?? []).length
  const subject = `📊 Reporte RRHH — ${fechaLegible(ayer)}${solPend > 0 ? ` · ${solPend} sol. pendiente${solPend > 1 ? 's' : ''}` : ''}${tickPend > 0 ? ` · ${tickPend} ticket${tickPend > 1 ? 's' : ''} abierto${tickPend > 1 ? 's' : ''}` : ''}`

  await transporter.sendMail({
    from: `"RRHH — Fundación Neuquén Oeste" <${gmailUser}>`,
    to: DEST,
    subject,
    html,
  })

  return NextResponse.json({
    ok: true,
    fecha: ayer,
    resumen: {
      solPendientes: solPend,
      solResueltasAyer: (solAyer ?? []).length,
      ticketsSinRespuesta: tickPend,
      recibosSubidosAyer: (recibosAyer ?? []).length,
      novedadesAyer: (novedadesAyer ?? []).length,
      registrosAyer: (registrosAyer ?? []).length,
      alertas: alertas.length,
    },
  })
}
