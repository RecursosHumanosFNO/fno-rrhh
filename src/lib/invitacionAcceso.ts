import type { SupabaseClient } from '@supabase/supabase-js'

// ── Invitación para crear la contraseña ──────────────────────────────────────
//
// Antes, al aprobar un acceso, el mail decía "entrá a Olvidé mi contraseña y
// poné tu email". Pedirle a alguien que diga que olvidó algo que nunca tuvo es
// confuso, y son tres pasos más para la primera entrada.
//
// Ahora el mail trae un link directo para definir la contraseña. Usa la misma
// tabla de tokens de un solo uso que el reset, con dos diferencias: dura una
// semana en vez de media hora —la persona puede estar de licencia, o abrir el
// mail el lunes— y el texto habla de crear, no de restablecer.

const TTL_INVITACION_MS = 7 * 24 * 60 * 60 * 1000

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portalfno.com'

/**
 * Deja un token de invitación y manda el mail con el link.
 *
 * No lanza: si el mail falla, la cuenta ya está creada y la persona siempre
 * puede usar "Olvidé mi contraseña". Devuelve si se pudo o no, para que quien
 * llame le avise a RRHH en vez de dar por hecho que la invitación salió.
 */
export async function enviarInvitacionAcceso(
  sb: SupabaseClient,
  { email, nombre }: { email: string; nombre: string },
): Promise<boolean> {
  const emailNorm = email.toLowerCase().trim()

  try {
    const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
    const { error } = await sb.from('fno_password_resets').upsert({
      email: emailNorm,
      token,
      expires_at: new Date(Date.now() + TTL_INVITACION_MS).toISOString(),
      used: false,
      created_at: new Date().toISOString(),
    })
    if (error) {
      console.error('[invitacion] token:', error.message)
      return false
    }

    const res = await fetch(`${PORTAL_URL}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Server-to-server: la persona todavía no tiene con qué autenticarse.
        ...(process.env.CRON_SECRET ? { 'x-internal-key': process.env.CRON_SECRET } : {}),
      },
      body: JSON.stringify({
        type: 'invitacion_acceso',
        data: { email: emailNorm, nombre, token },
      }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    return res.ok && cuerpo?.ok !== false
  } catch (err) {
    console.error('[invitacion]', err)
    return false
  }
}

export { TTL_INVITACION_MS }
