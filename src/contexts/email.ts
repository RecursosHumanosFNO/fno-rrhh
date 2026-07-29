import { authFetch } from '@/lib/authFetch'

/**
 * Dispara un email del portal. El fallo no interrumpe nada: si el mail no sale,
 * la acción del usuario ya se completó igual.
 */
export function sendEmail(type: string, data: Record<string, string>) {
  // authFetch adjunta el token de sesión: /api/notify lo exige para todo lo que
  // no sea un tipo público. Si no hay sesión (registro) va sin header y la ruta
  // lo resuelve por su cuenta.
  authFetch('/api/notify', {
    method: 'POST',
    body: JSON.stringify({ type, data }),
  }).catch(() => { /* email failure is non-fatal */ })
}
