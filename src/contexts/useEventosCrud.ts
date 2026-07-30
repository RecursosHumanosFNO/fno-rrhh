import { useCallback } from 'react'
import type { Evento } from '@/types'
import { uid, formatFecha } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import * as initial from '@/lib/mockData'
import { mapEventoToSupabase } from './mappers'
import type { Canal } from './useAviso'
import { recortar } from './texto'

type Aviso = ReturnType<typeof import('./useAviso').useAviso>

// IDs de los eventos institucionales fijos (feriados, actos, jornadas) que viven
// en el código (mockData) y NO en la base. Sirve para no persistirlos ni
// duplicarlos al sincronizar.
export const EVENTOS_FIJOS_IDS = new Set(initial.eventos.map(e => e.id))

function persistir(ev: Evento, modo: 'insert' | 'upsert') {
  if (!supabase) return
  const sb = supabase
  const ejecutar = (baseOnly: boolean) => modo === 'insert'
    ? sb.from('fno_eventos').insert(mapEventoToSupabase(ev, baseOnly))
    : sb.from('fno_eventos').upsert(mapEventoToSupabase(ev, baseOnly))

  ejecutar(false).then(({ error }) => {
    if (!error) return
    console.warn(`[supabase] ${modo} fno_eventos (full):`, error.message, error.code)
    ejecutar(true).then(({ error: e2 }) => {
      if (e2) console.error(`[supabase] ${modo} fno_eventos (base):`, e2.message, e2.code)
    })
  })
}

const porFecha = (a: Evento, b: Evento) => a.fecha.localeCompare(b.fecha)

export function useEventosCrud({ setEventos, eventosRef, aviso }: {
  setEventos: React.Dispatch<React.SetStateAction<Evento[]>>
  eventosRef: React.MutableRefObject<Evento[]>
  aviso: Aviso
}) {
  const avisar = useCallback((ev: Evento, canales: Canal[], esEdicion = false) => {
    const verbo = esEdicion ? 'Evento actualizado' : 'Nuevo evento'
    aviso({
      titulo: ev.titulo,
      destinatarios: ev.destinatarios,
      canales,
      textoApp: `📅 ${verbo}: ${ev.titulo} — ${ev.fecha}`,
      push: {
        titulo: esEdicion ? `${ev.titulo} (actualizado)` : ev.titulo,
        cuerpo: recortar([`📅 ${formatFecha(ev.fecha)}`, ev.descripcion].filter(Boolean).join(' — ')),
        url: '/dashboard/comunicaciones',
      },
      emailType: 'evento_notificacion',
      emailData: emails => ({
        emails: emails.join(','),
        titulo: ev.titulo, descripcion: ev.descripcion ?? '',
        fecha: ev.fecha, imagen: ev.imagen ?? '',
        esEdicion: esEdicion ? '1' : '',
      }),
    })
  }, [aviso])

  const addEvento = useCallback((e: Omit<Evento, 'id'>, canales: Canal[] = []) => {
    const nuevo: Evento = { ...e, id: uid() }
    setEventos(prev => [...prev, nuevo].sort(porFecha))
    avisar(nuevo, canales)
    persistir(nuevo, 'insert')
  }, [setEventos, avisar])

  const updateEvento = useCallback((id: string, data: Partial<Omit<Evento, 'id'>>, canales: Canal[] = []) => {
    const existente = eventosRef.current.find(e => e.id === id)
    setEventos(prev => prev.map(e => e.id === id ? { ...e, ...data } : e).sort(porFecha))
    if (!existente) return
    const full: Evento = { ...existente, ...data }
    avisar(full, canales, true)
    // Sólo persisten los eventos custom: los fijos viven en el código.
    if (!EVENTOS_FIJOS_IDS.has(id)) persistir(full, 'upsert')
  }, [setEventos, eventosRef, avisar])

  const deleteEvento = useCallback((id: string) => {
    setEventos(prev => prev.filter(e => e.id !== id))
    if (supabase && !EVENTOS_FIJOS_IDS.has(id)) {
      supabase.from('fno_eventos').delete().eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[supabase] delete fno_eventos:', error.message, error.code)
          alert(`No se pudo eliminar el evento de la base de datos: ${error.message}`)
        }
      })
    }
  }, [setEventos])

  return { addEvento, updateEvento, deleteEvento }
}
