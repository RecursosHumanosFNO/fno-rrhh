import { describe, it, expect } from 'vitest'
import { fusionarDetalle, conservarSensibles } from './detalleEmpleados'
import type { Empleado } from '@/types'

// Un empleado tal como sale del sync: directorio completo, sensibles vacíos.
function delDirectorio(id: string, nombre: string): Empleado {
  return {
    id, nombre, apellido: 'Pérez', dni: '', fechaNacimiento: '1990-05-02',
    email: `${nombre}@fno.com`, telefono: '', direccion: '', foto: 'f.jpg',
    fotoCover: '', cuil: '',
    contactoEmergencia: { nombre: '', telefono: '', relacion: '' },
    sector: 'Auxiliares', cargo: 'Auxiliar', cargosExtra: [], fechaIngreso: '',
    tipoContrato: 'Contrato', jornada: 'Full Time', supervisor: '',
    estado: 'activo', cbu: '', banco: '',
  }
}

describe('fusionarDetalle', () => {
  const directorio = [delDirectorio('e1', 'ana'), delDirectorio('e2', 'beto')]

  it('completa sólo los legajos que vinieron en el detalle', () => {
    // Lo que recibe un empleado común: únicamente el suyo.
    const [ana, beto] = fusionarDetalle(directorio, [
      { id: 'e1', dni: '30123456', cbu: '0170099220000067797777' },
    ])
    expect(ana.dni).toBe('30123456')
    expect(ana.cbu).toBe('0170099220000067797777')
    // El del compañero queda vacío, que es lo que la UI muestra como "—".
    expect(beto.dni).toBe('')
    expect(beto.cbu).toBe('')
  })

  it('no toca el directorio si el detalle viene vacío', () => {
    expect(fusionarDetalle(directorio, [])).toBe(directorio)
  })

  it('conserva los campos del directorio al fusionar', () => {
    const [ana] = fusionarDetalle(directorio, [{ id: 'e1', dni: '30123456' }])
    expect(ana.nombre).toBe('ana')
    expect(ana.foto).toBe('f.jpg')
    expect(ana.sector).toBe('Auxiliares')
  })
})

describe('conservarSensibles', () => {
  it('rescata del estado previo lo que el payload de Realtime no trae', () => {
    const existente = { ...delDirectorio('e1', 'ana'), dni: '30123456', cbu: '017009' }
    const incoming = { ...delDirectorio('e1', 'ana'), cargo: 'Coordinadora' }

    const r = conservarSensibles(incoming, existente)
    // Lo sensible sobrevive…
    expect(r.dni).toBe('30123456')
    expect(r.cbu).toBe('017009')
    // …y el cambio que motivó el evento se aplica igual.
    expect(r.cargo).toBe('Coordinadora')
  })

  it('deja pasar el valor nuevo cuando el payload sí lo trae', () => {
    const existente = { ...delDirectorio('e1', 'ana'), dni: '30123456' }
    const incoming = { ...delDirectorio('e1', 'ana'), dni: '99999999' }
    expect(conservarSensibles(incoming, existente).dni).toBe('99999999')
  })

  it('con un empleado nuevo (sin previo) devuelve la fila tal cual', () => {
    const incoming = delDirectorio('e9', 'nuevo')
    expect(conservarSensibles(incoming, undefined)).toBe(incoming)
  })
})
