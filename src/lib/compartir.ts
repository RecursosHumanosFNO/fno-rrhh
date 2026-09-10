import { formatFecha } from './utils'
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

// La repetición queda afuera a propósito: que un evento esté cargado como "cada
// año" es configuración del calendario, y esto se pega en los grupos de la
// Fundación. Al que lo lee le importa la fecha de este evento y nada más.
export function textoEventoWhatsapp(
  ev: Pick<Evento, 'titulo' | 'fecha' | 'hora' | 'descripcion'>,
): string {
  return [
    `*${limpio(ev.titulo)}*`,
    `📅 ${formatFecha(ev.fecha)}${ev.hora ? ` · 🕒 ${ev.hora} hs` : ''}`,
    limpio(ev.descripcion),
    '_Fundación Neuquén Oeste_',
  ].filter(Boolean).join('\n\n')
}

/**
 * Copia sólo el texto.
 *
 * Antes se copiaba texto e imagen en un mismo ítem del portapapeles, con la
 * idea de que WhatsApp tomara los dos. No funciona: al pegar, el sistema elige
 * UN formato —y elige la imagen—, así que el texto se perdía siempre. Ahora son
 * dos acciones separadas: se pega el texto, y después la foto.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

/**
 * Copia la imagen sola.
 *
 * El portapapeles sólo acepta PNG, así que lo que esté en otro formato se
 * reconvierte. El ClipboardItem se arma con una promesa y de forma sincrónica:
 * Safari exige que la escritura salga del mismo gesto del usuario, y si primero
 * se hace await del fetch, para cuando llega ya perdió el permiso.
 */
export async function copiarImagen(url: string): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': aPng(url) }),
    ])
    return true
  } catch {
    return false
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
