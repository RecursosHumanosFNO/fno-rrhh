import type { Empleado } from '@/types'

/**
 * Campos de Empleado que NO viajan en el sync general.
 *
 * El sync que corre en el navegador trae el "directorio" —lo que cualquier
 * compañero legítimamente necesita: nombre, sector, cargo, foto, cumpleaños—.
 * Estos otros son datos personales o laborales que sólo corresponden a quien
 * es dueño del legajo y a Gestión de Personal, así que llegan aparte por
 * /api/empleados-detalle, que valida el rol contra el JWT.
 *
 * Antes venían todos en el mismo select y la separación existía sólo en la
 * pantalla: cualquier empleado con abrir la consola del navegador leía el CBU,
 * el DNI y la desvinculación de todos sus compañeros.
 */
export const CAMPOS_SENSIBLES = [
  'dni', 'cuil', 'direccion', 'telefono', 'contactoEmergencia',
  'cbu', 'banco', 'desvinculacion', 'historialDesvinculaciones',
  'fechaIngreso', 'tipoContrato', 'jornada', 'supervisor',
  'credencialArt', 'credencialArtNombre', 'credencialArtSubidaEn',
] as const satisfies readonly (keyof Empleado)[]

/** Lo que devuelve /api/empleados-detalle: el id más lo sensible. */
export type DetalleEmpleado = { id: string } & Partial<Empleado>

/**
 * Mezcla el detalle sobre el directorio.
 *
 * Un empleado común recibe una sola entrada —la suya—, así que el resto de la
 * lista queda con los campos sensibles vacíos, que es exactamente lo que la UI
 * ya sabe mostrar como "—". Un admin recibe todas.
 */
export function fusionarDetalle(empleados: Empleado[], detalle: DetalleEmpleado[]): Empleado[] {
  if (!detalle.length) return empleados
  const porId = new Map(detalle.map(d => [d.id, d]))
  return empleados.map(e => {
    const d = porId.get(e.id)
    return d ? { ...e, ...d } : e
  })
}

/**
 * Conserva los campos sensibles que ya estaban en memoria cuando llega una
 * fila por Realtime.
 *
 * El payload de Realtime se arma con los permisos del cliente, así que puede
 * venir sin las columnas sensibles. Sin esto, editar un empleado le borraría
 * de la pantalla el CBU y el DNI hasta el próximo sync — el mismo síntoma que
 * ya tuvimos con las fotos, y por el mismo motivo.
 */
export function conservarSensibles(incoming: Empleado, existente: Empleado | undefined): Empleado {
  if (!existente) return incoming
  const fusionado = { ...incoming }
  for (const campo of CAMPOS_SENSIBLES) {
    const nuevo = fusionado[campo]
    const vacio = nuevo === undefined || nuevo === null || nuevo === ''
    if (vacio && existente[campo] !== undefined) {
      // El cast es inevitable: TypeScript no sabe que campo indexa el mismo
      // tipo en los dos objetos cuando se recorre una lista de claves.
      ;(fusionado as Record<string, unknown>)[campo] = existente[campo]
    }
  }
  return fusionado
}
