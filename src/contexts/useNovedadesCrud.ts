import { useCallback } from 'react'
import type { Novedad } from '@/types'
import { uid } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapNovedadToSupabase } from './mappers'
import type { Canal } from './useAviso'

type Aviso = ReturnType<typeof import('./useAviso').useAviso>

// El insert/upsert reintenta sin las columnas nuevas: si la migración de
// destinatarios todavía no se corrió, la novedad se guarda igual.
function persistir(nov: Novedad, modo: 'insert' | 'upsert') {
  if (!supabase) return
  const sb = supabase
  const ejecutar = (baseOnly: boolean) => modo === 'insert'
    ? sb.from('fno_novedades').insert(mapNovedadToSupabase(nov, baseOnly))
    : sb.from('fno_novedades').upsert(mapNovedadToSupabase(nov, baseOnly))

  ejecutar(false).then(({ error }) => {
    if (!error) return
    console.warn(`[supabase] ${modo} fno_novedades (full):`, error.message, error.code)
    ejecutar(true).then(({ error: e2 }) => {
      if (e2) console.error(`[supabase] ${modo} fno_novedades (base):`, e2.message, e2.code)
    })
  })
}

export function useNovedadesCrud({ setNovedades, novedadesRef, aviso }: {
  setNovedades: React.Dispatch<React.SetStateAction<Novedad[]>>
  novedadesRef: React.MutableRefObject<Novedad[]>
  aviso: Aviso
}) {
  const avisar = useCallback((n: Novedad, canales: Canal[], esEdicion = false) => {
    const verbo = esEdicion ? 'Novedad actualizada' : 'Nueva novedad publicada'
    aviso({
      titulo: n.titulo,
      destinatarios: n.destinatarios,
      canales,
      textoApp: `${verbo}: ${n.titulo}`,
      emailType: 'novedad_publicada',
      emailData: emails => ({
        titulo: n.titulo, contenido: n.contenido, autor: n.autor,
        imagen: n.imagen ?? '', emails: emails.join(','),
      }),
    })
  }, [aviso])

  const addNovedad = useCallback((n: Omit<Novedad, 'id'>, canales: Canal[] = []) => {
    const nueva: Novedad = { ...n, id: uid() }
    setNovedades(prev => [nueva, ...prev])
    avisar(nueva, canales)
    persistir(nueva, 'insert')
  }, [setNovedades, avisar])

  // El aviso y el guardado quedan afuera del updater: antes vivían adentro de
  // setNovedades, que React puede invocar más de una vez.
  const updateNovedad = useCallback((id: string, data: Partial<Omit<Novedad, 'id'>>, canales: Canal[] = []) => {
    const existente = novedadesRef.current.find(n => n.id === id)
    setNovedades(prev => prev.map(n => n.id === id ? { ...n, ...data } : n))
    if (!existente) return
    const full: Novedad = { ...existente, ...data }
    avisar(full, canales, true)
    persistir(full, 'upsert')
  }, [setNovedades, novedadesRef, avisar])

  const deleteNovedad = useCallback((id: string) => {
    setNovedades(prev => prev.filter(n => n.id !== id))
    if (supabase) supabase.from('fno_novedades').delete().eq('id', id).then()
  }, [setNovedades])

  return { addNovedad, updateNovedad, deleteNovedad }
}
