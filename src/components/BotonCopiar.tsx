'use client'

import { useState } from 'react'
import { Copy, Image as ImageIcon, Check, Loader2 } from 'lucide-react'
import { copiarTexto, copiarImagen } from '@/lib/compartir'

type Estado = 'listo' | 'copiando' | 'ok' | 'error'

/**
 * Dos botones separados: uno copia el texto y otro la imagen.
 *
 * Van separados porque el portapapeles no guarda las dos cosas a la vez: al
 * pegar, el sistema elige un solo formato —y elige la imagen—, así que el texto
 * se perdía. Ahora se pega el mensaje en el grupo y después la foto.
 */
export function BotonCopiar({ texto, imagenUrl, className = '' }: {
  texto: string
  imagenUrl?: string
  className?: string
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Boton
        label="Copiar texto"
        title="Copia el mensaje listo para pegar en el grupo de WhatsApp"
        icono={<Copy className="w-4 h-4" />}
        accion={() => copiarTexto(texto)}
      />
      {imagenUrl && (
        <Boton
          label="Copiar imagen"
          title="Copia la foto para pegarla después del mensaje"
          icono={<ImageIcon className="w-4 h-4" />}
          accion={() => copiarImagen(imagenUrl)}
        />
      )}
    </div>
  )
}

function Boton({ label, title, icono, accion }: {
  label: string
  title: string
  icono: React.ReactNode
  accion: () => Promise<boolean>
}) {
  const [estado, setEstado] = useState<Estado>('listo')

  async function copiar() {
    setEstado('copiando')
    const ok = await accion()
    setEstado(ok ? 'ok' : 'error')
    setTimeout(() => setEstado('listo'), ok ? 2500 : 4000)
  }

  const texto = {
    listo: label,
    copiando: 'Copiando...',
    ok: '¡Copiado!',
    error: 'No se pudo copiar',
  }[estado]

  return (
    <button
      onClick={copiar}
      disabled={estado === 'copiando'}
      title={title}
      className={`btn-secondary text-sm py-1.5 disabled:opacity-60 ${
        estado === 'error' ? 'text-red-600 dark:text-red-400' : ''
      }`}
    >
      {estado === 'copiando'
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : estado === 'ok'
          ? <Check className="w-4 h-4 text-emerald-600" />
          : icono}
      <span className="truncate">{texto}</span>
    </button>
  )
}
