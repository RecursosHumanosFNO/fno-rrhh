import { useCallback } from 'react'
import type { RegistroNovedad } from '@/types'
import { uid } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapRegistroNovedadToSupabase } from './mappers'

export function useRegistrosNovedadCrud({ setRegistrosNovedad, registrosRef }: {
  setRegistrosNovedad: React.Dispatch<React.SetStateAction<RegistroNovedad[]>>
  registrosRef: React.MutableRefObject<RegistroNovedad[]>
}) {
  // Devuelve el id para que la pantalla pueda seguir trabajando sobre el
  // registro recién creado (adjuntarle una foto, por ejemplo).
  const addRegistroNovedad = useCallback(async (r: Omit<RegistroNovedad, 'id' | 'creadoEn'>): Promise<string> => {
    const nuevo: RegistroNovedad = { ...r, id: uid(), creadoEn: new Date().toISOString() }
    setRegistrosNovedad(prev => [nuevo, ...prev])
    if (supabase) {
      const { error } = await supabase.from('fno_registros_novedad').insert(mapRegistroNovedadToSupabase(nuevo))
      if (error) console.error('[supabase] insert fno_registros_novedad:', error.message)
    }
    return nuevo.id
  }, [setRegistrosNovedad])

  // El guardado sale del updater, igual que en el resto de las entidades.
  const updateRegistroNovedad = useCallback((id: string, data: Partial<Omit<RegistroNovedad, 'id' | 'creadoEn'>>) => {
    const existente = registrosRef.current.find(r => r.id === id)
    setRegistrosNovedad(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    if (!existente || !supabase) return
    supabase.from('fno_registros_novedad')
      .upsert(mapRegistroNovedadToSupabase({ ...existente, ...data }))
      .then()
  }, [setRegistrosNovedad, registrosRef])

  const deleteRegistroNovedad = useCallback((id: string) => {
    setRegistrosNovedad(prev => prev.filter(r => r.id !== id))
    if (supabase) supabase.from('fno_registros_novedad').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[supabase] delete fno_registros_novedad:', error.message)
    })
  }, [setRegistrosNovedad])

  return { addRegistroNovedad, updateRegistroNovedad, deleteRegistroNovedad }
}
