import { describe, it, expect, afterEach, vi } from 'vitest'
import { hoyAR, formatFecha, formatMes, calcularEdad, calcularAntiguedad, conTimeout, esLunesEnAR } from './utils'

afterEach(() => vi.useRealTimers())

// Congela el reloj en un instante UTC concreto.
function reloj(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('hoyAR', () => {
  it('devuelve el día de Argentina, no el de UTC, cuando ya cambió el día en UTC', () => {
    // 23:30 del 20/07 en Argentina = 02:30 del 21/07 en UTC.
    // Este es el bug que la función existe para evitar: sin el ajuste
    // devolvería el 21 y adelantaría un día las fechas de creación.
    reloj('2026-07-21T02:30:00Z')
    expect(hoyAR()).toBe('2026-07-20')
  })

  it('no se adelanta en el mismo día', () => {
    reloj('2026-07-20T15:00:00Z') // 12:00 ARG
    expect(hoyAR()).toBe('2026-07-20')
  })

  it('cruza bien el fin de mes', () => {
    // 21:00 del 31/07 ARG = 00:00 del 01/08 UTC
    reloj('2026-08-01T00:00:00Z')
    expect(hoyAR()).toBe('2026-07-31')
  })
})

describe('formatFecha', () => {
  it('pasa de ISO a dd/mm/yyyy', () => {
    expect(formatFecha('2026-07-09')).toBe('09/07/2026')
  })

  it('no corre la fecha un día por zona horaria', () => {
    // Un parseo con `new Date('2026-01-01')` daría 31/12 al oeste de UTC.
    expect(formatFecha('2026-01-01')).toBe('01/01/2026')
  })

  it('tolera vacío', () => {
    expect(formatFecha('')).toBe('-')
  })
})

describe('formatMes', () => {
  it('usa el mes 1-indexado', () => {
    expect(formatMes(1, 2026)).toBe('Enero 2026')
    expect(formatMes(12, 2026)).toBe('Diciembre 2026')
  })
})

describe('calcularEdad', () => {
  it('resta un año si todavía no cumplió', () => {
    reloj('2026-07-20T12:00:00Z')
    expect(calcularEdad('2000-12-31')).toBe(25)
  })

  it('cuenta el año el mismo día del cumpleaños', () => {
    reloj('2026-07-20T12:00:00Z')
    expect(calcularEdad('2000-07-20')).toBe(26)
  })

  it('no lo cuenta el día anterior', () => {
    reloj('2026-07-20T12:00:00Z')
    expect(calcularEdad('2000-07-21')).toBe(25)
  })
})

describe('calcularAntiguedad', () => {
  it('describe los primeros días como menos de un mes', () => {
    reloj('2026-07-20T12:00:00Z')
    expect(calcularAntiguedad('2026-07-01')).toBe('Menos de 1 mes')
  })

  it('singulariza un mes', () => {
    reloj('2026-07-20T12:00:00Z')
    expect(calcularAntiguedad('2026-06-01')).toBe('1 mes')
  })

  it('usa meses hasta el año', () => {
    reloj('2026-07-20T12:00:00Z')
    expect(calcularAntiguedad('2025-10-01')).toBe('9 meses')
  })

  it('combina años y meses', () => {
    reloj('2026-07-20T12:00:00Z')
    expect(calcularAntiguedad('2024-04-01')).toBe('2 años y 3 meses')
  })

  it('omite los meses cuando son exactos', () => {
    reloj('2026-07-20T12:00:00Z')
    expect(calcularAntiguedad('2025-07-01')).toBe('1 año')
  })
})

describe('conTimeout', () => {
  it('devuelve el valor si la promesa resuelve a tiempo', async () => {
    await expect(conTimeout(Promise.resolve('ok'), 1000, 'tarde')).resolves.toBe('ok')
  })

  it('propaga el rechazo original en vez de taparlo con el timeout', async () => {
    const err = new Error('falló de verdad')
    await expect(conTimeout(Promise.reject(err), 1000, 'tarde')).rejects.toThrow('falló de verdad')
  })

  it('rechaza con el mensaje dado si la promesa nunca resuelve', async () => {
    vi.useFakeTimers()
    // Este es el caso que colgaba el botón en "Activando...": serviceWorker.ready
    // puede no resolver nunca si el SW no llega a activarse.
    const nuncaResuelve = new Promise<string>(() => {})
    const p = conTimeout(nuncaResuelve, 5000, 'se colgó')
    const assertion = expect(p).rejects.toThrow('se colgó')
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })
})

describe('esLunesEnAR', () => {
  it('reconoce el lunes al mediodía', () => {
    // 2026-07-27 fue lunes.
    expect(esLunesEnAR(new Date('2026-07-27T15:00:00Z'))).toBe(true)
  })

  it('no confunde el domingo a la noche con lunes', () => {
    // 21:00 del domingo en Argentina ya es lunes 00:00 en UTC: con getUTCDay()
    // a secas el reporte saldría un día antes.
    expect(esLunesEnAR(new Date('2026-07-27T00:30:00Z'))).toBe(false)
  })

  it('sigue siendo lunes a las 23 hs de Argentina', () => {
    // 23:00 del lunes ARG = 02:00 del martes UTC.
    expect(esLunesEnAR(new Date('2026-07-28T02:00:00Z'))).toBe(true)
  })

  it('rechaza el resto de los días', () => {
    expect(esLunesEnAR(new Date('2026-07-28T15:00:00Z'))).toBe(false) // martes
    expect(esLunesEnAR(new Date('2026-07-26T15:00:00Z'))).toBe(false) // domingo
  })

  it('coincide con la hora a la que corre el cron', () => {
    // El cron dispara 11:00 UTC = 8am ARG. Ese es el caso que importa.
    expect(esLunesEnAR(new Date('2026-07-27T11:00:00Z'))).toBe(true)
    expect(esLunesEnAR(new Date('2026-07-28T11:00:00Z'))).toBe(false)
  })
})
