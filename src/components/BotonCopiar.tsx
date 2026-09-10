'use client'

import { useState } from 'react'
import { Copy, Check, Loader2 } from 'lucide-react'
import { copiarParaWhatsapp } from '@/lib/compartir'

/**
 * Copia el texto de una novedad o de un evento listo para pegar en WhatsApp.
 *
 * El aviso de lo que pasó importa tanto como la copia: cuando el navegador no
 * deja llevarse la imagen —pasa seguido en iPhone— hay que decirlo, o alguien
 * pega el mensaje en el grupo convencido de que la foto iba adentro.
 */
export function BotonCopiar({ texto, imagenUrl, className = '' }: {
  texto: string
  imagenUrl?: string
  className?: string
}) {
  const [estado, setEstado] = useState<'listo' | 'copiando' | 'ok' | 'ok-sin-foto' | 'error'>('listo')

  async function copiar() {
    setEstado('copiando')
    const r = await copiarParaWhatsapp(texto, imagenUrl)
    const nuevo = r === 'error'
      ? 'error'
      : r === 'texto-e-imagen'
        ? 'ok'
        : imagenUrl ? 'ok-sin-foto' : 'ok'
    setEstado(nuevo)
    setTimeout(() => setEstado('listo'), nuevo === 'ok-sin-foto' ? 5000 : 2500)
  }

  const label = {
    listo: 'Copiar para WhatsApp',
    copiando: 'Copiando...',
    ok: '¡Copiado!',
    'ok-sin-foto': 'Texto copiado — la foto va aparte',
    error: 'No se pudo copiar',
  }[estado]

  return (
    <button
      onClick={copiar}
      disabled={estado === 'copiando'}
      title="Copia el mensaje listo para pegar en el grupo de WhatsApp"
      className={`btn-secondary text-sm py-1.5 disabled:opacity-60 ${
        estado === 'error' ? 'text-red-600 dark:text-red-400' : ''
      } ${className}`}
    >
      {estado === 'copiando'
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : estado === 'ok' || estado === 'ok-sin-foto'
          ? <Check className="w-4 h-4 text-emerald-600" />
          : <Copy className="w-4 h-4" />}
      <span className="truncate">{label}</span>
    </button>
  )
}
