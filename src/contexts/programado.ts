import type { Canal } from '@/types'

/**
 * ¿Esta publicación todavía no salió?
 *
 * `publicarEn` con una fecha futura significa "cargado pero no publicado": no se
 * ve, no avisa, y queda esperando a /api/cron/publicar-programados.
 */
export function estaProgramada(item: { publicarEn?: string }): boolean {
  return !!item.publicarEn && item.publicarEn > new Date().toISOString()
}

/**
 * Los canales que hay que guardar para avisar más tarde.
 *
 * Si se publica ahora, no se guarda nada: el aviso sale en el momento.
 */
export function canalesPendientes(publicarEn: string | undefined, canales: Canal[]): Canal[] | undefined {
  return publicarEn ? canales : undefined
}

/**
 * Del <input type="datetime-local"> al ISO que guarda la base.
 *
 * El input entrega "2026-09-15T08:00" en la hora del dispositivo, que acá es la
 * de Argentina; new Date() la interpreta así y toISOString() la pasa a UTC, que
 * es lo que espera una columna timestamptz.
 *
 * Una fecha ya pasada se descarta: programar para ayer es publicar ahora, y
 * dejarla guardada haría que el cron la publique en su próxima corrida sin que
 * nadie entienda por qué tardó.
 */
export function publicarEnISO(valor: string): string | undefined {
  if (!valor) return undefined
  const d = new Date(valor)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return undefined
  return d.toISOString()
}

/** Del ISO guardado al valor que entiende el <input type="datetime-local">. */
export function isoAInputLocal(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** "15/09/2026 a las 08:00" para mostrar en la etiqueta de programada. */
export function textoProgramada(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} a las ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Mañana a las 8 de la mañana: el default razonable para programar algo. */
export function manianaALasOcho(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(8, 0, 0, 0)
  return d.toISOString()
}
