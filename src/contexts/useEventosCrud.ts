import { useCallback } from 'react'
import type { Evento } from '@/types'
import { uid, formatFecha } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { borrarImagenMedia } from './storage'
import * as initial from '@/lib/mockData'
import { mapEventoToSupabase } from './mappers'
import type { Canal } from './useAviso'
import { recortar } from './texto'
import { estaProgramada } from './programado'
import { textoRepeticion } from '@/lib/recurrencia'

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
      // La fecha va formateada: en la campanita se leía "2026-09-10" pegado al
      // título, y un aviso que hay que descifrar no sirve de aviso.
      textoApp: `📅 ${verbo}: ${ev.titulo} · ${formatFecha(ev.fecha)}${ev.hora ? `, ${ev.hora}` : ''}`,
      push: {
        titulo: esEdicion ? `${ev.titulo} (actualizado)` : ev.titulo,
        cuerpo: recortar([
          `📅 ${formatFecha(ev.fecha)}${ev.hora ? `, ${ev.hora}` : ''}`,
          ev.descripcion,
        ].filter(Boolean).join(' — ')),
        // Al evento, no a Comunicaciones: es un evento del calendario. Con el id
        // la app abre esa ficha directamente en vez de dejarte en el mes.
        url: `/dashboard/eventos?ev=${ev.id}`,
      },
      emailType: 'evento_notificacion',
      emailData: emails => ({
        emails: emails.join(','),
        titulo: ev.titulo, descripcion: ev.descripcion ?? '',
        fecha: formatFecha(ev.fecha), hora: ev.hora ?? '', imagen: ev.imagen ?? '',
        repeticion: textoRepeticion(ev) ?? '',
        eventoId: ev.id,
        esEdicion: esEdicion ? '1' : '',
      }),
    })
  }, [aviso])

  const addEvento = useCallback((e: Omit<Evento, 'id'>, canales: Canal[] = []) => {
    // Igual que en novedades: si está programado, el aviso lo manda el cron.
    const programado = estaProgramada(e)
    const nuevo: Evento = {
      ...e,
      id: uid(),
      avisoCanales: programado ? canales : undefined,
    }
    setEventos(prev => [...prev, nuevo].sort(porFecha))
    if (!programado) avisar(nuevo, canales)
    persistir(nuevo, 'insert')
  }, [setEventos, avisar])

  const updateEvento = useCallback((id: string, data: Partial<Omit<Evento, 'id'>>, canales: Canal[] = []) => {
    const existente = eventosRef.current.find(e => e.id === id)
    setEventos(prev => prev.map(e => e.id === id ? { ...e, ...data } : e).sort(porFecha))
    if (!existente) return
    // Los fijos viven en mockData, no en la base: editarlos no se puede
    // persistir y el siguiente sync los devuelve como estaban. Antes se cortaba
    // recién al momento de guardar —después de tocar el estado y de mandar el
    // aviso de "evento actualizado"—, así que se avisaba de un cambio que a los
    // diez minutos se deshacía solo. Ahora se corta antes de todo.
    if (EVENTOS_FIJOS_IDS.has(id)) {
      alert('Los feriados y actos institucionales están fijados en el sistema y no se pueden editar.')
      return
    }
    const full: Evento = { ...existente, ...data }
    const programado = estaProgramada(full)
    if (programado) full.avisoCanales = canales
    if (!programado) avisar(full, canales, true)
    persistir(full, 'upsert')
  }, [setEventos, eventosRef, avisar])

  const deleteEvento = useCallback((id: string) => {
    if (EVENTOS_FIJOS_IDS.has(id)) {
      alert('Los feriados y actos institucionales están fijados en el sistema y no se pueden eliminar.')
      return
    }
    borrarImagenMedia(eventosRef.current.find(e => e.id === id)?.imagen)
    setEventos(prev => prev.filter(e => e.id !== id))
    if (supabase) {
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
