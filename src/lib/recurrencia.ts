import type { Evento, EventoRepeticion } from '@/types'

// ── Eventos que se repiten ───────────────────────────────────────────────────
//
// En la base se guarda UNA fila por evento, con su fecha original y cómo se
// repite. Las repeticiones no se guardan: se calculan al vuelo para el rango que
// se está mirando. Así, el día del maestro es una fila, no cuarenta, y cambiarle
// el título lo cambia en todos los años.
//
// Todo se hace con números (año, mes, día) y no con objetos Date: la app trabaja
// en horario de Argentina y con Date de por medio un evento del día 1 a las 00:00
// se corre al día anterior según la zona del navegador.

const MAX_OCURRENCIAS = 500

function partes(fecha: string): [number, number, number] {
  const [a, m, d] = fecha.split('-').map(Number)
  return [a, m, d]
}

function aTexto(a: number, m: number, d: number): string {
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function diasDelMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate() // mes 1-based: día 0 del siguiente
}

/**
 * Fechas en las que cae un evento dentro de [desde, hasta], ambas inclusive.
 *
 * Un evento sin repetición devuelve su fecha si entra en el rango, o nada.
 */
export function ocurrenciasEnRango(
  ev: Pick<Evento, 'fecha' | 'repeticion' | 'repeticionCada' | 'repeticionHasta'>,
  desde: string,
  hasta: string,
): string[] {
  if (!ev.fecha) return []
  if (!ev.repeticion) {
    return ev.fecha >= desde && ev.fecha <= hasta ? [ev.fecha] : []
  }

  // El evento no existe antes de su fecha original.
  const tope = ev.repeticionHasta && ev.repeticionHasta < hasta ? ev.repeticionHasta : hasta
  if (tope < ev.fecha) return []

  const cada = Math.max(1, Math.floor(ev.repeticionCada ?? 1))
  const [anio0, mes0, dia0] = partes(ev.fecha)
  const salida: string[] = []

  for (let i = 0; i < MAX_OCURRENCIAS; i++) {
    let fecha: string | null = null

    if (ev.repeticion === 'semanal') {
      // La única que se cuenta en días; se apoya en Date sólo para sumar, y se
      // vuelve a números enseguida.
      const base = new Date(anio0, mes0 - 1, dia0)
      base.setDate(base.getDate() + i * cada * 7)
      fecha = aTexto(base.getFullYear(), base.getMonth() + 1, base.getDate())
    } else if (ev.repeticion === 'mensual') {
      const total = (mes0 - 1) + i * cada
      const anio = anio0 + Math.floor(total / 12)
      const mes = (total % 12) + 1
      // Un evento del 31 no existe en los meses de 30: esa repetición se saltea,
      // igual que en Google Calendar. Correrlo al 30 inventaría una fecha.
      fecha = dia0 <= diasDelMes(anio, mes) ? aTexto(anio, mes, dia0) : null
    } else {
      const anio = anio0 + i * cada
      // Mismo criterio para el 29 de febrero: sólo en años bisiestos.
      fecha = dia0 <= diasDelMes(anio, mes0) ? aTexto(anio, mes0, dia0) : null
    }

    if (fecha && fecha > tope) break
    if (fecha && fecha >= desde) salida.push(fecha)
    // Si la ocurrencia no existe (31 en un mes de 30) se sigue con la próxima.
    if (fecha === null && i > 0) {
      const adelante = ev.repeticion === 'mensual' ? anio0 + Math.floor(((mes0 - 1) + i * cada) / 12) : anio0 + i * cada
      if (adelante > Number(tope.slice(0, 4))) break
    }
  }

  return salida
}

/**
 * Expande una lista de eventos a las ocurrencias que caen en el rango.
 *
 * El `id` se conserva: editar o borrar afecta a toda la serie, que es lo que se
 * espera de "se repite todos los años". Como puede haber varias ocurrencias del
 * mismo evento en pantalla, para las keys de React hay que combinar id + fecha.
 */
export function expandirEventos(eventos: Evento[], desde: string, hasta: string): Evento[] {
  const salida: Evento[] = []
  for (const ev of eventos) {
    for (const fecha of ocurrenciasEnRango(ev, desde, hasta)) {
      salida.push(fecha === ev.fecha ? ev : { ...ev, fecha })
    }
  }
  return salida.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export const REPETICION_LABEL: Record<EventoRepeticion, string> = {
  semanal: 'Cada semana',
  mensual: 'Cada mes',
  anual: 'Cada año',
}

/** Texto corto para mostrar en la ficha del evento. */
export function textoRepeticion(ev: Pick<Evento, 'repeticion' | 'repeticionCada' | 'repeticionHasta'>): string | null {
  if (!ev.repeticion) return null
  const cada = Math.max(1, Math.floor(ev.repeticionCada ?? 1))
  const unidad = ev.repeticion === 'semanal' ? 'semanas' : ev.repeticion === 'mensual' ? 'meses' : 'años'
  const base = cada === 1 ? REPETICION_LABEL[ev.repeticion] : `Cada ${cada} ${unidad}`
  if (!ev.repeticionHasta) return base
  const [a, m, d] = partes(ev.repeticionHasta)
  return `${base}, hasta el ${d}/${m}/${a}`
}
