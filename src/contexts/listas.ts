// Inserción idempotente en las listas del contexto.
//
// Realtime puede reenviar el mismo evento (reconexión, doble suscripción), así
// que agregar a ciegas duplicaría filas en pantalla: si el id ya está, se
// reemplaza en su lugar en vez de sumar otra entrada.
export function upsert<T extends { id: string }>(prev: T[], item: T): T[] {
  const i = prev.findIndex(x => x.id === item.id)
  return i >= 0 ? prev.map(x => x.id === item.id ? item : x) : [...prev, item]
}

// Igual que upsert, pero los nuevos van al principio: se usa en las listas que
// se muestran de más reciente a más viejo (novedades, notificaciones).
export function upsertHead<T extends { id: string }>(prev: T[], item: T): T[] {
  const i = prev.findIndex(x => x.id === item.id)
  return i >= 0 ? prev.map(x => x.id === item.id ? item : x) : [item, ...prev]
}
