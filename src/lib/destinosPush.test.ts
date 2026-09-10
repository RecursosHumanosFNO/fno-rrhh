import { describe, it, expect } from 'vitest'
import { esDestinoPushValido, DESTINOS_PUSH } from './destinosPush'

describe('esDestinoPushValido', () => {
  it('acepta los destinos de la lista', () => {
    for (const d of DESTINOS_PUSH) expect(esDestinoPushValido(d.url)).toBe(true)
  })

  it('acepta el link directo a un evento del calendario', () => {
    expect(esDestinoPushValido('/dashboard/eventos?ev=abc123')).toBe(true)
    expect(esDestinoPushValido('/dashboard/eventos?ev=a-b_C9')).toBe(true)
  })

  it('rechaza una ruta que no está en la lista, aunque traiga ?ev=', () => {
    expect(esDestinoPushValido('/dashboard/secreto?ev=abc')).toBe(false)
  })

  it('rechaza un id con caracteres raros', () => {
    expect(esDestinoPushValido('/dashboard/eventos?ev=../../etc')).toBe(false)
    expect(esDestinoPushValido('/dashboard/eventos?ev=a b')).toBe(false)
  })

  it('rechaza otros parámetros y URLs externas', () => {
    expect(esDestinoPushValido('/dashboard/eventos?otro=1')).toBe(false)
    expect(esDestinoPushValido('https://malo.com/dashboard/eventos?ev=a')).toBe(false)
    expect(esDestinoPushValido('//malo.com')).toBe(false)
  })

  it('rechaza lo que no es texto', () => {
    expect(esDestinoPushValido(undefined)).toBe(false)
    expect(esDestinoPushValido(42)).toBe(false)
  })
})
