'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'

/**
 * Miniatura de la foto de un registro interno.
 *
 * `fotoUrl` puede venir de dos formas y hay que soportar las dos:
 *  - una URL pública completa, de los registros creados antes de mover las
 *    fotos a un bucket privado; se usa tal cual porque siguen ahí.
 *  - un path dentro del bucket privado, que hay que cambiar por una URL firmada
 *    antes de poder mostrarlo.
 *
 * La firma dura diez minutos y antes se pedía UNA sola vez, al montar. En una
 * pantalla que alguien de RRHH deja abierta toda la jornada eso significaba que
 * a los diez minutos las miniaturas se rompían y, al tocarlas, se abría una
 * pantalla de error de Supabase ("InvalidJWT: exp claim timestamp check
 * failed"). Ahora se renueva: cuando la imagen falla al cargar y, sobre todo,
 * en el momento exacto de abrirla.
 */
export function FotoRegistro({ fotoUrl, className, onAbrir }: {
  fotoUrl: string
  className?: string
  onAbrir?: (url: string) => void
}) {
  const esLegacy = fotoUrl.startsWith('http')
  // Las viejas son URLs públicas y ya están listas: se derivan, no se guardan
  // en estado. Antes se copiaban con un setState dentro del efecto, que además
  // dejaba el valor viejo un render de más si cambiaba la prop.
  const [urlFirmada, setUrlFirmada] = useState('')
  // Corta el bucle si la imagen falla por algo que no sea el vencimiento (el
  // archivo no está, no hay permisos): se reintenta una vez y no más.
  const [reintentado, setReintentado] = useState(false)
  const url = esLegacy ? fotoUrl : urlFirmada

  const pedirFirma = useCallback(async (): Promise<string> => {
    try {
      const r = await authFetch(`/api/registro-foto?path=${encodeURIComponent(fotoUrl)}`)
      const d = await r.json()
      return typeof d?.url === 'string' ? d.url : ''
    } catch {
      return '' // sin foto es preferible a romper la lista
    }
  }, [fotoUrl])

  useEffect(() => {
    if (esLegacy) return
    let vigente = true
    setReintentado(false)
    pedirFirma().then(u => { if (vigente && u) setUrlFirmada(u) })
    return () => { vigente = false }
  }, [esLegacy, pedirFirma])

  async function abrir() {
    if (!onAbrir) return
    // La firma se pide RECIÉN ahora. La que se usó para la miniatura puede
    // tener horas y estar vencida, que es justo lo que pasaba al hacer clic.
    const fresca = esLegacy ? fotoUrl : (await pedirFirma()) || urlFirmada
    if (fresca) onAbrir(fresca)
  }

  if (!url) {
    return <div className={`${className ?? ''} bg-gray-100 dark:bg-gray-700 animate-pulse`} aria-hidden />
  }

  return (
    <img
      loading="lazy" width={64} height={64} src={url} alt=""
      className={className}
      onClick={onAbrir ? abrir : undefined}
      onError={() => {
        if (esLegacy || reintentado) return
        setReintentado(true)
        pedirFirma().then(u => { if (u) setUrlFirmada(u) })
      }}
    />
  )
}
