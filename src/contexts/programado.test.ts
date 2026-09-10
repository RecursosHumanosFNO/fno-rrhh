import { describe, it, expect } from 'vitest'
import { estaProgramada, publicarEnISO, isoAInputLocal, textoProgramada } from './programado'

const enUnaHora = new Date(Date.now() + 60 * 60 * 1000)
const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000)

describe('estaProgramada', () => {
  it('es true mientras la fecha no llegó', () => {
    expect(estaProgramada({ publicarEn: enUnaHora.toISOString() })).toBe(true)
  })

  it('es false cuando ya pasó o no hay fecha', () => {
    expect(estaProgramada({ publicarEn: haceUnaHora.toISOString() })).toBe(false)
    expect(estaProgramada({})).toBe(false)
  })
})

describe('publicarEnISO', () => {
  it('convierte lo que entrega el input', () => {
    const local = isoAInputLocal(enUnaHora.toISOString())
    const iso = publicarEnISO(local)
    expect(iso).toBeDefined()
    // Ida y vuelta: el minuto tiene que ser el mismo (el input no lleva segundos).
    expect(isoAInputLocal(iso)).toBe(local)
  })

  it('descarta el vacío y las fechas ya pasadas', () => {
    expect(publicarEnISO('')).toBeUndefined()
    expect(publicarEnISO(isoAInputLocal(haceUnaHora.toISOString()))).toBeUndefined()
    expect(publicarEnISO('no es una fecha')).toBeUndefined()
  })
})

describe('textoProgramada', () => {
  it('arma la fecha y la hora locales', () => {
    const d = new Date(2026, 8, 15, 8, 5) // 15/09/2026 08:05 local
    expect(textoProgramada(d.toISOString())).toBe('15/09/2026 a las 08:05')
  })

  it('tolera valores inválidos', () => {
    expect(textoProgramada(undefined)).toBe('')
    expect(textoProgramada('cualquier cosa')).toBe('')
  })
})
