import { formatFecha } from './utils'
import { textoRepeticion } from './recurrencia'
import type { Evento, Novedad } from '@/types'

// ── Copiar para mandar por WhatsApp ──────────────────────────────────────────
//
// WhatsApp entiende *negrita*, _cursiva_ y ~tachado~ en el texto plano. Lo que
// se copia es exactamente lo que se va a leer en el grupo, así que se arma acá y
// no se improvisa en la pantalla.

/** Escapa nada: WhatsApp no tiene HTML. Sólo limpia espacios de más. */
function limpio(t: string | undefined): string {
  return (t ?? '').replace(/[ \t]+\n/g, '\n').trim()
}

export function textoNovedadWhatsapp(n: Pick<Novedad, 'titulo' | 'contenido' | 'linkUrl'>): string {
  return [
    `*${limpio(n.titulo)}*`,
    limpio(n.contenido),
    n.linkUrl ? limpio(n.linkUrl) : '',
    '_Fundación Neuquén Oeste_',
  ].filter(Boolean).join('\n\n')
}

export function textoEventoWhatsapp(
  ev: Pick<Evento, 'titulo' | 'fecha' | 'hora' | 'descripcion' | 'repeticion' | 'repeticionCada' | 'repeticionHasta'>,
): string {
  const cuando = `📅 ${formatFecha(ev.fecha)}${ev.hora ? ` · 🕒 ${ev.hora} hs` : ''}`
  const repite = textoRepeticion(ev)
  return [
    `*${limpio(ev.titulo)}*`,
    [cuando, repite ? `🔁 ${repite}` : ''].filter(Boolean).join('\n'),
    limpio(ev.descripcion),
    '_Fundación Neuquén Oeste_',
  ].filter(Boolean).join('\n\n')
}

export type ResultadoCopia = 'texto-e-imagen' | 'solo-texto' | 'error'

/**
 * Copia el texto al portapapeles, y la imagen junto con él cuando el navegador
 * lo permite.
 *
 * Lo de la imagen es best-effort a propósito: el portapapeles con imagen sólo
 * funciona en contexto seguro, sólo con PNG (por eso se reconvierte), y algunos
 * navegadores lo rechazan si la escritura no sale de un gesto directo. Cuando no
 * se puede, el texto se copia igual y la pantalla avisa que la foto hay que
 * adjuntarla aparte — mejor eso que no copiar nada.
 */
export async function copiarParaWhatsapp(texto: string, imagenUrl?: string): Promise<ResultadoCopia> {
  const puedeItems = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write

  if (imagenUrl && puedeItems) {
    try {
      // El ClipboardItem se arma con promesas y de forma sincrónica: Safari
      // exige que la llamada salga del mismo gesto del usuario, y si primero se
      // hace await del fetch, para cuando llega ya perdió el permiso.
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([texto], { type: 'text/plain' }),
          'image/png': aPng(imagenUrl),
        }),
      ])
      return 'texto-e-imagen'
    } catch {
      // Sigue de largo: al menos el texto.
    }
  }

  try {
    await navigator.clipboard.writeText(texto)
    return 'solo-texto'
  } catch {
    return 'error'
  }
}

/** Descarga la imagen y la reconvierte a PNG, que es lo único que acepta el portapapeles. */
async function aPng(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors' })
  const original = await res.blob()
  if (original.type === 'image/png') return original

  const bitmap = await createImageBitmap(original)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo convertir la imagen'))), 'image/png')
  })
}
