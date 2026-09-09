import { describe, it, expect } from 'vitest'
import { ocurrenciasEnRango, expandirEventos, textoRepeticion } from './recurrencia'
import type { Evento } from '@/types'

const base = { fecha: '2026-09-11' } // Día del Maestro

describe('ocurrenciasEnRango — sin repetición', () => {
  it('devuelve la fecha si cae en el rango', () => {
    expect(ocurrenciasEnRango(base, '2026-09-01', '2026-09-30')).toEqual(['2026-09-11'])
  })

  it('no devuelve nada si queda fuera', () => {
    expect(ocurrenciasEnRango(base, '2026-10-01', '2026-10-31')).toEqual([])
  })
})

describe('anual', () => {
  const ev = { ...base, repeticion: 'anual' as const }

  it('aparece todos los años, también antes de que se cargue el evento... no', () => {
    // El evento no existe antes de su fecha original: 2025 no tiene que aparecer.
    expect(ocurrenciasEnRango(ev, '2025-01-01', '2025-12-31')).toEqual([])
  })

  it('aparece en los años siguientes', () => {
    expect(ocurrenciasEnRango(ev, '2029-01-01', '2029-12-31')).toEqual(['2029-09-11'])
  })

  it('respeta el hasta', () => {
    const conTope = { ...ev, repeticionHasta: '2028-12-31' }
    expect(ocurrenciasEnRango(conTope, '2029-01-01', '2029-12-31')).toEqual([])
    expect(ocurrenciasEnRango(conTope, '2028-01-01', '2028-12-31')).toEqual(['2028-09-11'])
  })

  it('cada 2 años saltea el del medio', () => {
    const cada2 = { ...ev, repeticionCada: 2 }
    expect(ocurrenciasEnRango(cada2, '2027-01-01', '2027-12-31')).toEqual([])
    expect(ocurrenciasEnRango(cada2, '2028-01-01', '2028-12-31')).toEqual(['2028-09-11'])
  })

  it('un 29 de febrero sólo cae en años bisiestos', () => {
    const bisiesto = { fecha: '2028-02-29', repeticion: 'anual' as const }
    expect(ocurrenciasEnRango(bisiesto, '2029-01-01', '2031-12-31')).toEqual([])
    expect(ocurrenciasEnRango(bisiesto, '2032-01-01', '2032-12-31')).toEqual(['2032-02-29'])
  })
})

describe('mensual', () => {
  it('cae todos los meses', () => {
    const ev = { fecha: '2026-09-05', repeticion: 'mensual' as const }
    expect(ocurrenciasEnRango(ev, '2026-09-01', '2026-12-31'))
      .toEqual(['2026-09-05', '2026-10-05', '2026-11-05', '2026-12-05'])
  })

  it('el 31 se saltea en los meses que no lo tienen, no se corre al 30', () => {
    const ev = { fecha: '2026-01-31', repeticion: 'mensual' as const }
    const r = ocurrenciasEnRango(ev, '2026-01-01', '2026-06-30')
    expect(r).toEqual(['2026-01-31', '2026-03-31', '2026-05-31'])
    expect(r.some(f => f.startsWith('2026-02'))).toBe(false)
  })

  it('cruza el fin de año', () => {
    const ev = { fecha: '2026-11-10', repeticion: 'mensual' as const }
    expect(ocurrenciasEnRango(ev, '2027-01-01', '2027-02-28'))
      .toEqual(['2027-01-10', '2027-02-10'])
  })
})

describe('semanal', () => {
  it('cae cada siete días', () => {
    const ev = { fecha: '2026-09-07', repeticion: 'semanal' as const }
    expect(ocurrenciasEnRango(ev, '2026-09-01', '2026-09-30'))
      .toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'])
  })

  it('cada 2 semanas', () => {
    const ev = { fecha: '2026-09-07', repeticion: 'semanal' as const, repeticionCada: 2 }
    expect(ocurrenciasEnRango(ev, '2026-09-01', '2026-09-30'))
      .toEqual(['2026-09-07', '2026-09-21'])
  })
})

describe('expandirEventos', () => {
  const eventos = [
    { id: 'a', titulo: 'Día del Maestro', fecha: '2026-09-11', tipo: 'conmemoracion', repeticion: 'anual' },
    { id: 'b', titulo: 'Reunión de equipo', fecha: '2026-09-02', tipo: 'reunion' },
  ] as Evento[]

  it('devuelve las ocurrencias ordenadas por fecha', () => {
    const r = expandirEventos(eventos, '2026-09-01', '2026-09-30')
    expect(r.map(e => `${e.id}:${e.fecha}`)).toEqual(['b:2026-09-02', 'a:2026-09-11'])
  })

  it('conserva el id en las repeticiones, para poder editar la serie', () => {
    const r = expandirEventos(eventos, '2030-01-01', '2030-12-31')
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe('a')
    expect(r[0].fecha).toBe('2030-09-11')
    expect(r[0].titulo).toBe('Día del Maestro')
  })

  it('no toca el objeto original', () => {
    expandirEventos(eventos, '2030-01-01', '2030-12-31')
    expect(eventos[0].fecha).toBe('2026-09-11')
  })
})

describe('textoRepeticion', () => {
  it('describe la repetición simple', () => {
    expect(textoRepeticion({ repeticion: 'anual' })).toBe('Cada año')
  })

  it('describe el intervalo y el tope', () => {
    expect(textoRepeticion({ repeticion: 'semanal', repeticionCada: 2, repeticionHasta: '2026-12-31' }))
      .toBe('Cada 2 semanas, hasta el 31/12/2026')
  })

  it('devuelve null si no se repite', () => {
    expect(textoRepeticion({})).toBeNull()
  })
})
