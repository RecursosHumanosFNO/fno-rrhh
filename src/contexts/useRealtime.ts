import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  mapSupabaseToEmpleado,
  mapSupabaseToEvento,
  mapSupabaseToNotif,
  mapSupabaseToNovedad,
  mapSupabaseToPending,
  mapSupabaseToRecibo,
  mapSupabaseToRegistroNovedad,
  mapSupabaseToSolicitud,
  mapSupabaseToTicket,
  mapSupabaseToUser,
} from './mappers'
import { upsert, upsertHead } from './listas'
import { useRefEspejo } from './useRefEspejo'
import type { Setters } from './setters'
import type { Empleado } from '@/types'

type Fila = Record<string, unknown>
type CambioRealtime = { eventType: string; new: unknown; old: unknown }

// Una fila que llega por Realtime puede no traer la foto (el payload viene
// recortado según lo que cambió). Si la pisáramos con undefined, la foto
// desaparecería de la pantalla hasta el próximo sync completo — que es
// exactamente el síntoma de "se borran solas al editar" que ya nos pasó.
function conservarFotos(incoming: Empleado, existente: Empleado | undefined): Empleado {
  if (!existente) return incoming
  if (!incoming.foto && existente.foto) incoming.foto = existente.foto
  if (!incoming.fotoCover && existente.fotoCover) incoming.fotoCover = existente.fotoCover
  return incoming
}

/**
 * Canal de Supabase Realtime con los cambios incrementales de todas las tablas.
 *
 * Sólo se conecta cuando hay sesión activa: con RLS habilitado, suscribirse sin
 * auth devuelve CHANNEL_ERROR. Por eso el canal se arma y se desarma siguiendo
 * a onAuthStateChange en vez de montarse una sola vez.
 *
 * `syncFromSupabase` tiene que venir con identidad estable (ver useSupabaseSync):
 * es dependencia de este efecto, así que si cambiara por render el canal se
 * desarmaría y rearmaría sin parar.
 */
export function useRealtime(setters: Setters, syncFromSupabase: () => Promise<void>) {
  const settersRef = useRefEspejo(setters)

  useEffect(() => {
    if (!supabase) return
    const sb = supabase

    let channel: ReturnType<typeof sb.channel> | null = null

    // Atajo para las tablas que sólo hacen "borrar por id" o "insertar arriba".
    function tabla<T extends { id: string }>(
      set: React.Dispatch<React.SetStateAction<T[]>>,
      map: (row: Fila) => T,
    ) {
      return ({ eventType, new: n, old: o }: CambioRealtime) => {
        if (eventType === 'DELETE') {
          const { id } = o as { id: string }
          set(prev => prev.filter(x => x.id !== id))
        } else {
          set(prev => upsertHead(prev, map(n as Fila)))
        }
      }
    }

    function setupChannel() {
      if (channel) sb.removeChannel(channel)
      const s = settersRef.current
      channel = sb.channel('fno_realtime_auth')

      // Empleados: no usa el atajo porque hay que conservar las fotos y porque
      // el orden de la lista no es "el último arriba".
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'fno_empleados' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'DELETE') s.setEmpleados(prev => prev.filter(e => e.id !== (o as { id: string }).id))
        else s.setEmpleados(prev => {
          const incoming = mapSupabaseToEmpleado(n as Fila)
          return upsert(prev, conservarFotos(incoming, prev.find(e => e.id === incoming.id)))
        })
      })

      // Usuarios y pendientes tampoco van arriba de todo: son listas sin orden
      // cronológico, así que mantienen la posición con upsert.
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'fno_users' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'DELETE') s.setUsers(prev => prev.filter(u => u.id !== (o as { id: string }).id))
        else s.setUsers(prev => upsert(prev, mapSupabaseToUser(n as Record<string, string>)))
      })

      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'fno_pending' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'DELETE') s.setPending(prev => prev.filter(p => p.id !== (o as { id: string }).id))
        else s.setPending(prev => upsert(prev, mapSupabaseToPending(n as Record<string, string>)))
      })

      // Eventos: los custom se mezclan con los fijos, así que hay que reordenar
      // por fecha después de cada cambio.
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'fno_eventos' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'DELETE') s.setEventos(prev => prev.filter(e => e.id !== (o as { id: string }).id))
        else s.setEventos(prev => {
          const ev = mapSupabaseToEvento(n as Fila)
          return [...prev.filter(e => e.id !== ev.id), ev].sort((a, b) => a.fecha.localeCompare(b.fecha))
        })
      })

      // El resto son todas cronológicas: lo nuevo va arriba.
      const cronologicas: [string, (p: CambioRealtime) => void][] = [
        ['fno_solicitudes', tabla(s.setSolicitudes, mapSupabaseToSolicitud)],
        ['fno_recibos', tabla(s.setRecibos, mapSupabaseToRecibo)],
        ['fno_novedades', tabla(s.setNovedades, mapSupabaseToNovedad)],
        ['fno_tickets', tabla(s.setTickets, mapSupabaseToTicket)],
        ['fno_notifs', tabla(s.setNotifications, mapSupabaseToNotif)],
        ['fno_registros_novedad', tabla(s.setRegistrosNovedad, mapSupabaseToRegistroNovedad)],
      ]
      for (const [table, handler] of cronologicas) {
        channel = channel!.on('postgres_changes', { event: '*', schema: 'public', table }, handler)
      }

      channel.subscribe()
    }

    // Rearmar el canal cuando la pestaña vuelve de background: en móvil el
    // WebSocket queda muerto y no se entera solo.
    const onReconnect = () => { if (channel) setupChannel() }
    window.addEventListener('fno:reconnect-realtime', onReconnect)

    const { data: { subscription: authSub } } = sb.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED pasa ~cada hora y no requiere rearmar nada. Ignorarlo
      // evita un teardown/re-subscribe que deja un hueco sin eventos.
      if (event === 'TOKEN_REFRESHED') return

      // Diferir con setTimeout(0): sin esto se traba el lock interno de
      // Supabase y updateUser/signIn quedan colgados al rearmar el canal.
      setTimeout(() => {
        if (session) {
          setupChannel()
          // INITIAL_SESSION es la sesión que ya estaba al cargar la página, y
          // useSupabaseSync ya sincroniza al montar. Sincronizar acá también
          // duplicaba la descarga de las once tablas —con las fotos adentro— en
          // cada carga. Un login de verdad (SIGNED_IN) sí necesita el sync.
          if (event !== 'INITIAL_SESSION') syncFromSupabase()
        } else if (channel) {
          sb.removeChannel(channel)
          channel = null
        }
      }, 0)
    })

    return () => {
      window.removeEventListener('fno:reconnect-realtime', onReconnect)
      authSub.unsubscribe()
      if (channel) sb.removeChannel(channel)
    }
    // settersRef es un ref: su identidad no cambia nunca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncFromSupabase])
}
