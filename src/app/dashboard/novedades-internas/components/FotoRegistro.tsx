'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'

/**
 * Miniatura de la foto de un registro interno.
 *
 * `fotoUrl` puede venir de dos formas y hay que soportar las dos:
 *  - una URL pública completa, de los registros creados antes de mover las
 *    fotos a un bucket privado; se usa tal cual porque siguen ahí.
 *  - un path dentro del bucket privado, que hay que cambiar por una URL firmada
 *    antes de poder mostrarlo. La firma dura diez minutos.
 */
export function FotoRegistro({ fotoUrl, className, onAbrir }: {
  fotoUrl: string
  className?: string
  onAbrir?: (url: string) => void
}) {
  const esLegacy = fotoUrl.startsWith('http')
  const [url, setUrl] = useState(esLegacy ? fotoUrl : '')

  useEffect(() => {
    if (esLegacy) { setUrl(fotoUrl); return }
    let vigente = true
    authFetch(`/api/registro-foto?path=${encodeURIComponent(fotoUrl)}`)
      .then(r => r.json())
      .then(d => { if (vigente && d?.url) setUrl(d.url) })
      .catch(() => { /* sin foto es preferible a romper la lista */ })
    return () => { vigente = false }
  }, [fotoUrl, esLegacy])

  if (!url) {
    return <div className={`${className ?? ''} bg-gray-100 dark:bg-gray-700 animate-pulse`} aria-hidden />
  }

  return (
    <img
      loading="lazy" width={64} height={64} src={url} alt=""
      className={className}
      onClick={onAbrir ? () => onAbrir(url) : undefined}
    />
  )
}
