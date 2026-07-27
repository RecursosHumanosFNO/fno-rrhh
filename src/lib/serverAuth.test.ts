import { describe, it, expect } from 'vitest'
import { esGestionPersonal } from './serverAuth'

// Los campos que no mira la función no importan para el permiso.
const con = (role: string) => ({
  authId: 'a', email: 'e@e.com', role, empleadoId: 'emp', userId: 'u',
})

describe('esGestionPersonal', () => {
  it('acepta admin', () => {
    expect(esGestionPersonal(con('admin'))).toBe(true)
  })

  it('acepta rrhh', () => {
    expect(esGestionPersonal(con('rrhh'))).toBe(true)
  })

  it('rechaza empleados', () => {
    expect(esGestionPersonal(con('employee'))).toBe(false)
  })

  it('rechaza comunicaciones', () => {
    // Comunicaciones publica novedades y eventos, pero no gestiona personal.
    expect(esGestionPersonal(con('comunicaciones'))).toBe(false)
  })

  it('rechaza a quien no se pudo identificar', () => {
    // getRequester devuelve null si el JWT no valida: nunca debe pasar por admin.
    expect(esGestionPersonal(null)).toBe(false)
  })

  it('rechaza un rol desconocido', () => {
    expect(esGestionPersonal(con('otro'))).toBe(false)
  })
})
