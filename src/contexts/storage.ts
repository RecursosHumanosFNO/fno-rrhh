import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/authFetch'

/**
 * Borra la imagen que acompañaba a una novedad o a un evento.
 *
 * Los tres CRUD borraban la fila y nada más, así que cada novedad eliminada
 * dejaba su imagen en el bucket para siempre. Lo mismo al editar reemplazando
 * la imagen: el path lleva timestamp y se sube con upsert:false, con lo cual la
 * anterior quedaba huérfana.
 *
 * Se recibe la URL pública tal como está guardada y se saca de ahí el path. Si
 * no tiene la forma esperada —una URL de otro lado, o un valor viejo— no se
 * hace nada: borrar por las dudas es peor que dejar un archivo de más.
 */
export function borrarImagenMedia(url: string | undefined) {
  if (!url || !supabase) return
  const marca = '/object/public/fno-media/'
  const i = url.indexOf(marca)
  if (i === -1) return
  const path = decodeURIComponent(url.slice(i + marca.length))
  if (!path || path.includes('..')) return
  supabase.storage.from('fno-media').remove([path]).then(({ error }) => {
    if (error) console.error('[storage] remove fno-media:', error.message)
  })
}

/**
 * Borra la foto de un registro interno. Vive en un bucket privado, así que sólo
 * la puede tocar el server; las de antes de la mudanza son URLs públicas de
 * fno-media y se borran por la otra vía.
 */
export function borrarFotoRegistro(fotoUrl: string | undefined) {
  if (!fotoUrl) return
  if (fotoUrl.startsWith('http')) { borrarImagenMedia(fotoUrl); return }
  authFetch(`/api/registro-foto?path=${encodeURIComponent(fotoUrl)}`, { method: 'DELETE' })
    .catch(() => { /* el registro ya se borró; el archivo no es crítico */ })
}
