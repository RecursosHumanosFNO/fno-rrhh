import { describe, it, expect } from 'vitest'
import { upsert, upsertHead } from './listas'

type Item = { id: string; texto: string }

const a: Item = { id: 'a', texto: 'uno' }
const b: Item = { id: 'b', texto: 'dos' }

describe('upsert', () => {
  it('agrega al final cuando el id es nuevo', () => {
    expect(upsert([a], b)).toEqual([a, b])
  })

  it('reemplaza en su lugar si el id ya está', () => {
    // Realtime reenvía el mismo evento al reconectar: sin esto la fila se
    // duplicaría en pantalla.
    const actualizado = { id: 'a', texto: 'uno editado' }
    expect(upsert([a, b], actualizado)).toEqual([actualizado, b])
  })

  it('no altera la posición al reemplazar', () => {
    const actualizado = { id: 'b', texto: 'dos editado' }
    expect(upsert([a, b], actualizado).map(i => i.id)).toEqual(['a', 'b'])
  })

  it('no muta el array original', () => {
    const lista = [a]
    upsert(lista, b)
    expect(lista).toEqual([a])
  })

  it('funciona sobre una lista vacía', () => {
    expect(upsert([], a)).toEqual([a])
  })
})

describe('upsertHead', () => {
  it('agrega al principio cuando el id es nuevo', () => {
    // Las listas que lo usan van de más reciente a más viejo.
    expect(upsertHead([a], b)).toEqual([b, a])
  })

  it('reemplaza en su lugar si el id ya está, sin moverlo al frente', () => {
    const actualizado = { id: 'a', texto: 'uno editado' }
    expect(upsertHead([a, b], actualizado)).toEqual([actualizado, b])
  })

  it('no muta el array original', () => {
    const lista = [a]
    upsertHead(lista, b)
    expect(lista).toEqual([a])
  })
})
