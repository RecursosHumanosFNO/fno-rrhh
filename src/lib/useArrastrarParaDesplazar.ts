import { useEffect } from 'react'

// Lo que se puede arrastrar: las tablas y filas que ya se desplazan de
// costado (.overflow-x-auto) y las filas de pestañas (.desliza).
const SELECTOR = '.overflow-x-auto, .desliza'

// Cuántos píxeles hay que mover el mouse para que cuente como arrastre y no
// como clic. Con menos, un clic con el pulso un poco movido en una pestaña o
// en un botón de la tabla dejaría de funcionar.
const UMBRAL_PX = 6

/**
 * Arrastrar con el mouse para ver lo que no entra a los costados.
 *
 * Con el dedo o el trackpad eso ya funciona solo. Con un mouse común no: la
 * única forma era encontrar la barrita de desplazamiento de abajo —que en una
 * tabla larga ni siquiera está a la vista— o saber lo de Shift + ruedita.
 *
 * Se instala una sola vez en el layout del dashboard y escucha en el
 * documento, así vale para toda tabla y fila de pestañas presente y futura sin
 * tener que acordarse de agregarlo en cada pantalla. Sólo se activa sobre un
 * elemento que de verdad tenga contenido escondido a los costados.
 */
export function useArrastrarParaDesplazar() {
  useEffect(() => {
    let el: HTMLElement | null = null
    let inicioX = 0
    let scrollInicial = 0
    let arrastrando = false

    function alApretar(e: MouseEvent) {
      if (e.button !== 0) return
      const destino = e.target as HTMLElement | null
      // Los campos de texto y los desplegables tienen su propio uso del mouse
      // (seleccionar texto, abrir la lista): ahí no se intercepta nada.
      if (!destino || destino.closest('input, textarea, select, [contenteditable="true"]')) return
      const contenedor = destino.closest<HTMLElement>(SELECTOR)
      if (!contenedor || contenedor.scrollWidth <= contenedor.clientWidth) return
      el = contenedor
      inicioX = e.clientX
      scrollInicial = contenedor.scrollLeft
      arrastrando = false
    }

    function alMover(e: MouseEvent) {
      if (!el) return
      const dx = e.clientX - inicioX
      if (!arrastrando) {
        if (Math.abs(dx) < UMBRAL_PX) return
        arrastrando = true
        el.style.cursor = 'grabbing'
        el.style.userSelect = 'none'
      }
      el.scrollLeft = scrollInicial - dx
      e.preventDefault()
    }

    function alSoltar() {
      if (!el) return
      const fueArrastre = arrastrando
      el.style.cursor = ''
      el.style.userSelect = ''
      el = null
      arrastrando = false
      // Si fue un arrastre, el clic que el navegador dispara al soltar se
      // descarta: soltar sobre una pestaña o un botón no tiene que activarlo.
      if (fueArrastre) {
        const tragar = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault() }
        document.addEventListener('click', tragar, { capture: true, once: true })
        // Por si el navegador no dispara ese clic (soltó fuera del elemento):
        // que no quede esperando y se coma el próximo clic de verdad.
        setTimeout(() => document.removeEventListener('click', tragar, { capture: true }), 0)
      }
    }

    document.addEventListener('mousedown', alApretar)
    document.addEventListener('mousemove', alMover)
    document.addEventListener('mouseup', alSoltar)
    return () => {
      document.removeEventListener('mousedown', alApretar)
      document.removeEventListener('mousemove', alMover)
      document.removeEventListener('mouseup', alSoltar)
    }
  }, [])
}
