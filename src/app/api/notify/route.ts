import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

const ADMIN_EMAIL = 'rrhhfundacionnqnoeste@gmail.com'
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portalfundacion.vercel.app'

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
        Portal RRHH — Fundación Neuquén Oeste · <a href="${PORTAL_URL}" style="color:#3078ac;">portalfundacion.vercel.app</a>
      </p>
    </div>
  </div>`
}

function row(label: string, value: string, alt = false) {
  const bg = alt ? 'background:#f8fafc;' : ''
  return `<tr><td style="padding:10px 12px;font-weight:600;color:#475569;${bg}width:140px;">${label}</td><td style="padding:10px 12px;color:#1e293b;${bg}">${value || '—'}</td></tr>`
}

function btn(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin-top:20px;">${text} →</a>`
}

export async function POST(req: NextRequest) {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_PASS

  // Log env var status so we can diagnose in Vercel logs
  console.log('[notify] GMAIL_USER:', gmailUser ? `${gmailUser.slice(0, 6)}***` : 'NO CONFIGURADO')
  console.log('[notify] GMAIL_PASS:', gmailPass ? `${gmailPass.length} chars` : 'NO CONFIGURADO')

  // If email not configured, silently succeed (don't break UI)
  if (!gmailUser || !gmailPass) {
    console.log('[notify] Abortando: variables de entorno no configuradas')
    return NextResponse.json({ ok: false, reason: 'Email no configurado' })
  }

  let body: { type: string; data: Record<string, string> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid JSON' }, { status: 400 })
  }

  const { type, data } = body
  console.log('[notify] Enviando email tipo:', type, '→', data.email ?? ADMIN_EMAIL)
  const from = `"RRHH — Fundación Neuquén Oeste" <${gmailUser}>`

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  })

  try {
    /* ── Nueva solicitud de registro ───────────────────────────────── */
    if (type === 'new_registration') {
      await transporter.sendMail({
        from, to: ADMIN_EMAIL,
        subject: `🔔 Nueva solicitud de acceso — ${data.nombre} ${data.apellido}`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Nueva solicitud de acceso al portal</h3>
          <p style="color:#64748b;">Un empleado solicitó acceso al sistema y está pendiente de aprobación.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            ${row('Nombre', `${data.nombre} ${data.apellido}`)}
            ${row('DNI', data.dni, true)}
            ${row('Email', data.email)}
            ${row('Sector', data.sector, true)}
            ${row('Cargo', data.cargo)}
            ${row('Teléfono', data.telefono || 'No informado', true)}
          </table>
          <p style="color:#64748b;font-size:14px;">Ingresá al portal para <strong>aprobar o rechazar</strong> esta solicitud:</p>
          ${btn('Ver solicitudes pendientes', `${PORTAL_URL}/dashboard/empleados`)}
        `),
      })
    }

    /* ── Registro aprobado ─────────────────────────────────────────── */
    else if (type === 'registration_approved') {
      await transporter.sendMail({
        from, to: data.email,
        subject: `✅ ¡Tu acceso al Portal RRHH fue aprobado!`,
        html: base(`
          <h3 style="color:#10b981;margin-top:0;">¡Bienvenido/a al Portal RRHH!</h3>
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p style="color:#64748b;">Tu solicitud de acceso al Portal de Recursos Humanos de la <strong>Fundación Neuquén Oeste</strong> fue <strong style="color:#10b981;">aprobada</strong> por el equipo de RRHH.</p>
          <p style="color:#64748b;">Ya podés iniciar sesión con el <strong>email y contraseña</strong> que registraste originalmente.</p>
          ${btn('Ingresar al Portal', `${PORTAL_URL}/login`)}
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Si tenés alguna duda, respondé este email o comunicate con el área de RRHH.</p>
        `),
      })
    }

    /* ── Registro rechazado ────────────────────────────────────────── */
    else if (type === 'registration_rejected') {
      await transporter.sendMail({
        from, to: data.email,
        subject: `Actualización sobre tu solicitud — Portal RRHH FNO`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Actualización de tu solicitud</h3>
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p style="color:#64748b;">Lamentablemente tu solicitud de acceso al Portal RRHH no pudo ser aprobada en este momento.</p>
          <p style="color:#64748b;">Para más información, comunicate directamente con el área de Recursos Humanos:</p>
          <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0;color:#475569;"><strong>📧 Email:</strong> rrhhfundacionnqnoeste@gmail.com</p>
          </div>
        `),
      })
    }

    /* ── Nueva solicitud (empleado) → admin ────────────────────────── */
    else if (type === 'new_solicitud') {
      const horario = data.horarioDesde
        ? `${data.horarioDesde}${data.horarioHasta ? ` a ${data.horarioHasta} hs` : ' hs'}`
        : ''
      await transporter.sendMail({
        from, to: ADMIN_EMAIL,
        subject: `📋 Nueva solicitud — ${data.tipo} · ${data.nombre}`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Nueva solicitud recibida</h3>
          <p style="color:#64748b;margin-top:0;">Un empleado envió una nueva solicitud que requiere tu revisión.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            ${row('Empleado', data.nombre)}
            ${row('Cargo / Sector', `${data.cargo}${data.sector ? ' · ' + data.sector : ''}`, true)}
            ${row('Tipo de solicitud', `<strong>${data.tipo}</strong>`)}
            ${row('Fecha inicio', data.fechaInicio, true)}
            ${data.fechaFin ? row('Fecha fin', data.fechaFin) : ''}
            ${horario ? row('Horario', horario, !data.fechaFin) : ''}
            ${row('Descripción', data.descripcion, true)}
          </table>
          ${btn('Revisar solicitud', `${PORTAL_URL}/dashboard/solicitudes`)}
        `),
      })
    }

    /* ── Solicitud resuelta → empleado ─────────────────────────────── */
    else if (type === 'solicitud_resuelta') {
      const aprobada = data.estado === 'aprobado'
      await transporter.sendMail({
        from, to: data.email,
        subject: `${aprobada ? '✅' : '❌'} Tu solicitud de ${data.tipo} fue ${aprobada ? 'aprobada' : 'rechazada'}`,
        html: base(`
          <h3 style="color:${aprobada ? '#10b981' : '#ef4444'};margin-top:0;">
            Solicitud ${aprobada ? 'Aprobada ✅' : 'Rechazada ❌'}
          </h3>
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p style="color:#64748b;">
            Tu solicitud de <strong>${data.tipo}</strong> fue
            <strong style="color:${aprobada ? '#10b981' : '#ef4444'};">${aprobada ? 'APROBADA' : 'RECHAZADA'}</strong>
            por el equipo de RRHH.
          </p>
          ${data.comentario ? `
            <div style="background:#f1f5f9;border-left:4px solid ${BRAND};border-radius:0 8px 8px 0;padding:16px;margin:20px 0;">
              <p style="margin:0 0 4px 0;font-weight:600;color:#475569;font-size:13px;">Comentario de RRHH:</p>
              <p style="margin:0;color:#1e293b;">${data.comentario}</p>
            </div>` : ''}
          ${btn('Ver mis solicitudes', `${PORTAL_URL}/dashboard/solicitudes`)}
        `),
      })
    }

    /* ── Recibo disponible → empleado ─────────────────────────────────────── */
    else if (type === 'recibo_disponible') {
      await transporter.sendMail({
        from, to: data.email,
        subject: `💰 Tu recibo de sueldo de ${data.periodo} está disponible`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Recibo de sueldo disponible</h3>
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p style="color:#64748b;">Tu recibo de sueldo correspondiente a <strong>${data.periodo}</strong> ya está disponible en el Portal RRHH.</p>
          <p style="color:#64748b;">Podés descargarlo ingresando a tu cuenta:</p>
          ${btn('Ver mis recibos', `${PORTAL_URL}/dashboard/recibos`)}
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Si tenés alguna duda, respondé este email o comunicate con el área de RRHH.</p>
        `),
      })
    }

    /* ── Ticket respondido → empleado ──────────────────────────────────────── */
    else if (type === 'ticket_respondido') {
      await transporter.sendMail({
        from, to: data.email,
        subject: `💬 RRHH respondió tu pedido: ${data.asunto}`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Respuesta a tu pedido de RRHH</h3>
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p style="color:#64748b;">El equipo de Recursos Humanos respondió a tu pedido <strong>"${data.asunto}"</strong>.</p>
          <div style="background:#f1f5f9;border-left:4px solid ${BRAND};border-radius:0 8px 8px 0;padding:16px;margin:20px 0;">
            <p style="margin:0 0 4px 0;font-weight:600;color:#475569;font-size:13px;">Respuesta de RRHH:</p>
            <p style="margin:0;color:#1e293b;">${data.respuesta}</p>
          </div>
          ${btn('Ver mi pedido', `${PORTAL_URL}/dashboard/portal-rrhh`)}
        `),
      })
    }

    /* ── Novedad publicada → todos ─────────────────────────────────────────── */
    else if (type === 'novedad_publicada') {
      await transporter.sendMail({
        from, to: ADMIN_EMAIL,
        subject: `📢 Nueva novedad publicada: ${data.titulo}`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Nueva novedad publicada</h3>
          <p style="color:#64748b;">Se publicó una nueva novedad en el portal:</p>
          <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px 0;font-weight:700;color:#1e293b;font-size:16px;">${data.titulo}</p>
            <p style="margin:0;color:#475569;">${data.contenido}</p>
            ${data.imagen ? `<img src="${data.imagen}" alt="" style="margin-top:12px;max-width:100%;border-radius:8px;display:block;" />` : ''}
            <p style="margin:8px 0 0 0;color:#94a3b8;font-size:12px;">Publicado por ${data.autor}</p>
          </div>
          ${btn('Ver en el portal', `${PORTAL_URL}/dashboard/comunicaciones`)}
        `),
      })
    }

    /* ── Solicitud de reset de contraseña ──────────────────────────────────── */
    else if (type === 'reset_password') {
      const resetUrl = `${PORTAL_URL}/reset-password?token=${data.token}`
      await transporter.sendMail({
        from, to: data.email,
        subject: `🔑 Restablecer contraseña — Portal RRHH FNO`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Restablecer contraseña</h3>
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p style="color:#64748b;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Portal RRHH.</p>
          <p style="color:#64748b;">Hacé clic en el botón de abajo para crear una nueva contraseña. El link es válido por <strong>30 minutos</strong>.</p>
          ${btn('Restablecer contraseña', resetUrl)}
          <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-top:20px;">
            <p style="margin:0;color:#92400e;font-size:13px;">⚠️ Si no solicitaste este cambio, ignorá este email. Tu contraseña no se modificará.</p>
          </div>
        `),
      })
    }

    /* ── Contraseña cambiada → empleado (aviso de seguridad) ───────────────── */
    else if (type === 'password_changed') {
      await transporter.sendMail({
        from, to: data.email,
        subject: `🔒 Tu contraseña del Portal RRHH fue cambiada`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Tu contraseña fue actualizada</h3>
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p style="color:#64748b;">Te avisamos que la contraseña de tu cuenta en el Portal RRHH de la <strong>Fundación Neuquén Oeste</strong> fue cambiada correctamente.</p>
          <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin:20px 0;">
            <p style="margin:0;color:#92400e;font-size:13px;">⚠️ Si <strong>no</strong> fuiste vos quien hizo este cambio, comunicate de inmediato con el área de RRHH: rrhhfundacionnqnoeste@gmail.com</p>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Por tu seguridad, nunca compartimos tu contraseña por email.</p>
        `),
      })
    }

    /* ── Mensaje directo de RRHH al empleado ──────────────────────────────── */
    else if (type === 'mensaje_rrhh') {
      await transporter.sendMail({
        from, to: data.email,
        subject: `📋 Mensaje de RRHH: ${data.asunto}`,
        html: base(`
          <h3 style="color:${BRAND};margin-top:0;">Mensaje del área de RRHH</h3>
          <p>Hola <strong>${data.nombre}</strong>,</p>
          <p style="color:#64748b;">El área de Recursos Humanos de la <strong>Fundación Neuquén Oeste</strong> te envía el siguiente mensaje:</p>
          <div style="background:#f1f5f9;border-left:4px solid ${BRAND};border-radius:0 8px 8px 0;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px 0;font-weight:700;color:#1e293b;">${data.asunto}</p>
            <p style="margin:0;color:#475569;white-space:pre-wrap;">${data.mensaje}</p>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Si tenés dudas, respondé este email o comunicate directamente con el área de RRHH.</p>
          ${btn('Ir al Portal', PORTAL_URL)}
        `),
      })
    }

    console.log('[notify] ✅ Email enviado correctamente, tipo:', type)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notify] ❌ Error al enviar email:', err)
    // Return 200 so UI doesn't break even if email fails
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
