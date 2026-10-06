import type { SupabaseClient } from '@supabase/supabase-js'

// ── Aviso de acceso habilitado ───────────────────────────────────────────────
//
// Al portal se entra con la cuenta de Google, así que este mail ya no crea
// ninguna contraseña ni ningún token: sólo le avisa a la persona que RRHH
// aprobó su acceso y que puede entrar.
//
// Pasó por tres formas: primero decía "entrá a Olvidé mi contraseña", después
// traía un link de un solo uso para definirla, y ahora no necesita ninguna de
// las dos. Cada vuelta sacó un paso donde la gente se trababa.

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portalfno.com'

/**
 * Avisa por mail que el acceso quedó habilitado.
 *
 * No lanza: si el mail falla, la cuenta ya está creada y la persona puede
 * entrar igual con Google. Devuelve si se pudo o no, para que quien llame le
 * avise a RRHH en vez de dar por hecho que el aviso salió.
 */
export async function enviarInvitacionAcceso(
  sb: SupabaseClient,
  { email, nombre }: { email: string; nombre: string },
): Promise<boolean> {
  const emailNorm = email.toLowerCase().trim()

  try {
    const res = await fetch(`${PORTAL_URL}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Server-to-server: la persona todavía no tiene con qué autenticarse.
        ...(process.env.CRON_SECRET ? { 'x-internal-key': process.env.CRON_SECRET } : {}),
      },
      body: JSON.stringify({
        type: 'invitacion_acceso',
        data: { email: emailNorm, nombre },
      }),
    })
    const cuerpo = await res.json().catch(() => ({}))
    return res.ok && cuerpo?.ok !== false
  } catch (err) {
    console.error('[invitacion]', err)
    return false
  }
}
