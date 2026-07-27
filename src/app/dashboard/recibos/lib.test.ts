import { describe, it, expect } from 'vitest'
import { normDni, extractDniFromFilename, MESES } from './lib'

describe('normDni', () => {
  it('saca puntos y guiones para poder comparar', () => {
    expect(normDni('30.123.456')).toBe('30123456')
    expect(normDni('30-123-456')).toBe('30123456')
  })

  it('deja igual un DNI ya limpio', () => {
    expect(normDni('30123456')).toBe('30123456')
  })

  it('tolera vacío', () => {
    expect(normDni('')).toBe('')
  })

  it('hace comparables dos formatos del mismo documento', () => {
    // Es lo único que importa: así se matchea el PDF con el empleado.
    expect(normDni('30.123.456')).toBe(normDni('30123456'))
  })
})

describe('extractDniFromFilename', () => {
  it('encuentra un DNI de 8 dígitos', () => {
    expect(extractDniFromFilename('recibo_30123456_julio.pdf')).toBe('30123456')
  })

  it('encuentra uno de 7 dígitos', () => {
    expect(extractDniFromFilename('9876543 - recibo.pdf')).toBe('9876543')
  })

  it('ignora la extensión', () => {
    expect(extractDniFromFilename('30123456.pdf')).toBe('30123456')
  })

  it('devuelve vacío si no hay ningún número', () => {
    expect(extractDniFromFilename('recibo_sin_dni.pdf')).toBe('')
  })

  it('no toma secuencias demasiado cortas', () => {
    // Un mes o un año suelto no puede confundirse con un documento.
    expect(extractDniFromFilename('recibo_2026.pdf')).toBe('')
    expect(extractDniFromFilename('recibo_07.pdf')).toBe('')
  })

  it('no toma secuencias demasiado largas', () => {
    expect(extractDniFromFilename('recibo_123456789012.pdf')).toBe('')
  })
})

describe('MESES', () => {
  it('tiene los doce en orden', () => {
    expect(MESES).toHaveLength(12)
    expect(MESES[0]).toBe('Enero')
    expect(MESES[11]).toBe('Diciembre')
  })
})
