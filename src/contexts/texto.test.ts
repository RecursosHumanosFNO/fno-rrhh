import { describe, it, expect } from 'vitest'
import { recortar } from './texto'

describe('recortar', () => {
  it('deja intacto lo que entra dentro del largo', () => {
    expect(recortar('Reunión de equipo el viernes')).toBe('Reunión de equipo el viernes')
  })

  it('normaliza saltos de línea y espacios repetidos', () => {
    // El contenido de una novedad viene con saltos; en una push se ve todo
    // seguido, así que conviene colapsarlos.
    expect(recortar('Hola\n\n  equipo   ')).toBe('Hola equipo')
  })

  it('corta y agrega puntos suspensivos cuando se pasa', () => {
    const largo = 'a'.repeat(200)
    const r = recortar(largo, 20)
    expect(r).toHaveLength(21) // 20 + el carácter de elipsis
    expect(r.endsWith('…')).toBe(true)
  })

  it('corta en el espacio anterior para no partir una palabra', () => {
    const r = recortar('palabras cortas que suman bastante largo', 20)
    expect(r).toBe('palabras cortas que…')
  })

  it('corta al ras si la palabra es tan larga que no hay dónde cortar', () => {
    // Sin este caso, buscar el espacio anterior devolvería una cadena vacía.
    const r = recortar('a' + 'b'.repeat(50), 10)
    expect(r).toBe('abbbbbbbbb…')
  })

  it('tolera texto vacío', () => {
    expect(recortar('')).toBe('')
  })
})
