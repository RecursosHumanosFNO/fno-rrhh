import { describe, it, expect } from 'vitest'
import { esc, escaparValores, imagenSegura } from './htmlMail'

describe('esc', () => {
  it('neutraliza las etiquetas', () => {
    expect(esc('<a href="http://malo">Aprobar</a>'))
      .toBe('&lt;a href=&quot;http://malo&quot;&gt;Aprobar&lt;/a&gt;')
  })

  it('escapa el & antes que el resto (si no, quedaría &amp;lt;)', () => {
    expect(esc('a & <b>')).toBe('a &amp; &lt;b&gt;')
  })

  it('deja los acentos y la ñ como están', () => {
    expect(esc('Muñoz — Neuquén')).toBe('Muñoz — Neuquén')
  })

  it('convierte null y undefined en cadena vacía', () => {
    expect(esc(null)).toBe('')
    expect(esc(undefined)).toBe('')
  })
})

describe('escaparValores', () => {
  it('escapa todos los valores del objeto', () => {
    expect(escaparValores({ nombre: 'Ana', cargo: '<script>x</script>' }))
      .toEqual({ nombre: 'Ana', cargo: '&lt;script&gt;x&lt;/script&gt;' })
  })

  it('tolera un objeto vacío', () => {
    expect(escaparValores({})).toEqual({})
  })
})

describe('imagenSegura', () => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL

  it('rechaza javascript: y data:', () => {
    expect(imagenSegura('javascript:alert(1)')).toBeNull()
    expect(imagenSegura('data:image/png;base64,AAA')).toBeNull()
  })

  it('rechaza http sin cifrar', () => {
    expect(imagenSegura('http://malo/pixel.png')).toBeNull()
  })

  it('acepta una https del propio Storage', () => {
    const url = `${base ?? 'https://x.supabase.co'}/storage/v1/object/public/fno-media/a.jpg`
    if (!base) process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    expect(imagenSegura(url)).toBe(url)
  })

  it('sin url no devuelve nada', () => {
    expect(imagenSegura(undefined)).toBeNull()
    expect(imagenSegura('')).toBeNull()
  })
})
