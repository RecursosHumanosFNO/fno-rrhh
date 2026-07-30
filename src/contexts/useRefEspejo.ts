import { useRef, useEffect } from 'react'

/**
 * Mantiene un ref al día con el último valor de un estado.
 *
 * Sirve para leer la lista actual dentro de un callback sin meterla en sus
 * dependencias (lo que lo recrearía en cada cambio) ni quedar atado al valor
 * capturado. Reemplaza el vicio de llamar a un setter con un updater que no
 * modifica nada y termina en `return prev`, sólo para espiar el estado: React
 * puede invocar esos updaters más de una vez, así que cualquier efecto metido
 * ahí adentro —mandar un mail, por ejemplo— no tiene garantía de correr una
 * sola vez.
 */
export function useRefEspejo<T>(valor: T): React.MutableRefObject<T> {
  const ref = useRef(valor)
  useEffect(() => { ref.current = valor }, [valor])
  return ref
}
