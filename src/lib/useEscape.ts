'use client'

import { useEffect, useRef } from 'react'

/**
 * Cierra con la tecla Escape.
 *
 * Escape es el gesto universal para "salir de acá", y en el portal no hacía
 * nada: había veinticuatro ventanas emergentes y una sola —el visor de
 * imágenes— la escuchaba. Quien navega con teclado quedaba obligado a buscar
 * la X con el mouse, y el resto simplemente apretaba Escape y no pasaba nada.
 *
 * El listener se engancha sólo mientras la ventana está abierta, así que no
 * queda ninguno dando vueltas cuando no hay nada que cerrar.
 *
 * @param abierto  si la ventana está visible; con false no hace nada
 * @param cerrar   qué ejecutar al apretar Escape
 */
export function useEscape(abierto: boolean, cerrar: () => void) {
  // `cerrar` suele ser una arrow nueva en cada render. Si entrara en las
  // dependencias del efecto, el listener se desarmaría y rearmaría sin parar;
  // si la dejáramos afuera sin más, el efecto se quedaría con la versión del
  // render en que se abrió la ventana y cerraría con datos viejos. El ref
  // resuelve las dos cosas: se engancha una vez y siempre llama a la última.
  const cerrarRef = useRef(cerrar)
  // La asignación va en un efecto y no suelta en el render: escribir un ref
  // mientras se renderiza es un efecto colateral y React lo marca como error.
  useEffect(() => { cerrarRef.current = cerrar })

  useEffect(() => {
    if (!abierto) return
    const alApretar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarRef.current()
    }
    document.addEventListener('keydown', alApretar)
    return () => document.removeEventListener('keydown', alApretar)
  }, [abierto])
}
