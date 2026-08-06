import { authFetch } from '@/lib/authFetch'

/**
 * Dispara un email del portal. El fallo no interrumpe nada: si el mail no sale,
 * la acción del usuario ya se completó igual.
 *
 * Devuelve si el envío salió de verdad. /api/notify siempre responde 200 para no
 * romper la UI, pero distingue en el cuerpo (`ok: false` si Gmail rechazó o si
 * faltan credenciales). Quien quiera decirle algo al usuario sobre el mail tiene
 * que mirar eso y no dar por hecho que salió.
 */
export async function sendEmail(type: string, data: Record<string, string>): Promise<boolean> {
  // authFetch adjunta el token de sesión: /api/notify lo exige para todo lo que
  // no sea un tipo público. Si no hay sesión (registro) va sin header y la ruta
  // lo resuelve por su cuenta.
  try {
    const res = await authFetch('/api/notify', {
      method: 'POST',
      body: JSON.stringify({ type, data }),
    })
    const cuerpo = await res.json().catch(() => ({ ok: false }))
    return res.ok && cuerpo?.ok === true
  } catch {
    return false // email failure is non-fatal
  }
}
