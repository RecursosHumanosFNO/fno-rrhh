/* ── Escapado ───────────────────────────────────────────────────────────────
 * Todo lo que llega en `data` se interpola dentro del HTML del mail. Sin
 * escapar, un valor con etiquetas se convertía en HTML de verdad: y como
 * `new_registration` es un tipo PÚBLICO, alguien sin ninguna sesión podía
 * mandar un cargo como `<a href="http://malo">Aprobar acceso</a>` y hacer que
 * la casilla de RRHH recibiera un mail de phishing con enlaces ajenos, firmado
 * y enviado desde la dirección real de la Fundación.
 *
 * El escapado se hace UNA vez, sobre todo el objeto, y el objeto escapado se
 * llama `data` a propósito: así el default de cualquier plantilla que se agregue
 * mañana es el seguro. Lo que NO es HTML —el asunto, el destinatario— usa `raw`,
 * porque ahí un &amp; se leería literal.
 */
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escaparValores(d: Record<string, string>): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const [k, v] of Object.entries(d ?? {})) salida[k] = esc(v)
  return salida
}

/* Las imágenes se insertan como src="…". Aunque el valor esté escapado, un
 * `javascript:` o un `data:` ahí adentro sigue siendo un problema, y una URL
 * externa convierte al mail en un pixel de rastreo. Sólo pasan las https del
 * Storage del propio proyecto. */
export function imagenSegura(url: string | undefined): string | null {
  if (!url) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const ok = url.startsWith('https://') && (!base || url.startsWith(base))
  return ok ? url : null
}
