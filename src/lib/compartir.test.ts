import { describe, it, expect } from 'vitest'
import { textoNovedadWhatsapp, textoEventoWhatsapp } from './compartir'

describe('textoNovedadWhatsapp', () => {
  it('pone el título en negrita de WhatsApp y firma al final', () => {
    const t = textoNovedadWhatsapp({ titulo: 'Reunión', contenido: 'Es a las 10.' })
    expect(t).toBe('*Reunión*\n\nEs a las 10.\n\n_Fundación Neuquén Oeste_')
  })

  it('incluye el link si la novedad tiene', () => {
    const t = textoNovedadWhatsapp({ titulo: 'A', contenido: 'B', linkUrl: 'https://fno.org/x' })
    expect(t).toContain('https://fno.org/x')
  })

  it('no deja renglones vacíos cuando falta el contenido', () => {
    expect(textoNovedadWhatsapp({ titulo: 'Solo título', contenido: '' }))
      .toBe('*Solo título*\n\n_Fundación Neuquén Oeste_')
  })
})

describe('textoEventoWhatsapp', () => {
  it('arma fecha y hora', () => {
    const t = textoEventoWhatsapp({ titulo: 'Acto', fecha: '2026-09-11', hora: '10:00' })
    expect(t).toContain('*Acto*')
    expect(t).toContain('🕒 10:00 hs')
    expect(t).toContain('📅')
  })

  it('sin hora no deja el reloj colgado', () => {
    const t = textoEventoWhatsapp({ titulo: 'Feriado', fecha: '2026-09-11' })
    expect(t).not.toContain('🕒')
  })

  it('NO dice que el evento se repite: es configuración interna, no va al grupo', () => {
    const t = textoEventoWhatsapp({ titulo: 'Día del Maestro', fecha: '2026-09-11' })
    expect(t).not.toContain('🔁')
    expect(t.toLowerCase()).not.toContain('cada año')
  })

  it('incluye la descripción cuando está', () => {
    const t = textoEventoWhatsapp({ titulo: 'A', fecha: '2026-09-11', descripcion: 'Traer carpeta' })
    expect(t).toContain('Traer carpeta')
  })
})
