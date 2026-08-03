import { useCallback, useEffect, useState } from 'react'
import * as initial from '@/lib/mockData'
import { supabase } from '@/lib/supabase'
import {
  mapSupabaseToEmpleado,
  mapSupabaseToEvento,
  mapSupabaseToFirma,
  mapSupabaseToNotif,
  mapSupabaseToNovedad,
  mapSupabaseToPending,
  mapSupabaseToRecibo,
  mapSupabaseToRegistroNovedad,
  mapSupabaseToSolicitud,
  mapSupabaseToTicket,
  mapSupabaseToUser,
} from './mappers'
import { EVENTOS_FIJOS_IDS } from './useEventosCrud'
import { useRefEspejo } from './useRefEspejo'
import type { Setters } from './setters'

// Fallback lento. OJO: NO bajar este intervalo — un polling de 30s descargaba
// toda la base ~120 veces/hora por pestaña y reventó la cuota de egress de
// Supabase. Los cambios en vivo ya llegan por Realtime; esto es red de seguridad.
const INTERVALO_SYNC_MS = 600_000

/**
 * Trae todas las tablas de Supabase y las vuelca en el estado del contexto.
 *
 * Corre al montar, al volver a la pestaña y cada diez minutos.
 *
 * `syncFromSupabase` mantiene identidad estable a propósito: el efecto de
 * Realtime lo tiene como dependencia, así que si cambiara en cada render el
 * canal se desarmaría y rearmaría sin parar. Por eso los setters entran por un
 * ref en vez de por el array de dependencias.
 */
export function useSupabaseSync(setters: Setters) {
  const [synced, setSynced] = useState(false)
  const settersRef = useRefEspejo(setters)

  const syncFromSupabase = useCallback(async () => {
    if (!supabase) return
    const s = settersRef.current
    try {
      const [usersRes, pendingRes, empRes, solRes, recRes, novRes, tickRes, notifRes, evtRes, firmasRes, regNovRes] = await Promise.all([
        supabase.from('fno_users').select('id, email, role, empleado_id'),
        supabase.from('fno_pending').select('*'),
        // Las columnas van explícitas (no `*`) porque la tabla tiene campos
        // pesados y este select se corre entero cada diez minutos por pestaña.
        // Tiene que ser un literal: Supabase infiere el tipo de la fila a
        // partir del string, y con una constante devuelve GenericStringError.
        supabase.from('fno_empleados').select('id, nombre, apellido, dni, fecha_nacimiento, email, telefono, direccion, cuil, contacto_emergencia, sector, cargo, cargos_extra, fecha_ingreso, tipo_contrato, jornada, supervisor, estado, cbu, banco, desvinculacion, historial_desvinculaciones, foto, foto_cover'),
        supabase.from('fno_solicitudes').select('*'),
        supabase.from('fno_recibos').select('*'),
        supabase.from('fno_novedades').select('*'),
        supabase.from('fno_tickets').select('*'),
        supabase.from('fno_notifs').select('*').order('fecha', { ascending: false }).limit(200),
        supabase.from('fno_eventos').select('*'),
        supabase.from('fno_recibo_firmas').select('*'),
        supabase.from('fno_registros_novedad').select('*').order('creado_en', { ascending: false }),
      ])

      // Supabase es siempre la fuente de verdad — actualizar aunque el array
      // venga vacío, porque así se reflejan también los borrados.
      if (usersRes.data) s.setUsers(usersRes.data.map(mapSupabaseToUser))
      if (pendingRes.data) s.setPending(pendingRes.data.map(mapSupabaseToPending))
      if (empRes.data) s.setEmpleados(empRes.data.map(r => mapSupabaseToEmpleado(r as Record<string, unknown>)))
      if (solRes.data) s.setSolicitudes(solRes.data.map(mapSupabaseToSolicitud))
      if (recRes.data) s.setRecibos(recRes.data.map(mapSupabaseToRecibo))
      if (novRes.data) s.setNovedades(novRes.data.map(mapSupabaseToNovedad))
      if (tickRes.data) s.setTickets(tickRes.data.map(mapSupabaseToTicket))
      if (notifRes.data) s.setNotifications(notifRes.data.map(mapSupabaseToNotif))
      if (firmasRes.data) s.setFirmas(firmasRes.data.map(mapSupabaseToFirma))
      if (regNovRes.data) s.setRegistrosNovedad(regNovRes.data.map(mapSupabaseToRegistroNovedad))

      // Eventos: los feriados y actos viven en el código; de la base salen sólo
      // los custom, filtrando cualquier fijo que se haya colado como fila.
      if (evtRes.data) {
        const custom = evtRes.data
          .filter(r => !EVENTOS_FIJOS_IDS.has(r.id as string))
          .map(mapSupabaseToEvento)
        s.setEventos([...initial.eventos, ...custom].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      }
    } catch (e) {
      console.error('[sync] Supabase sync error:', e)
    } finally {
      setSynced(true)
    }
    // settersRef es un ref: su identidad no cambia nunca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    syncFromSupabase()

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      syncFromSupabase()
      // Pedirle al canal de Realtime que se rearme: el WebSocket se cae al
      // pasar a background, cosa habitual en iOS Safari y dentro de la PWA.
      window.dispatchEvent(new Event('fno:reconnect-realtime'))
    }
    document.addEventListener('visibilitychange', onVisible)

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') syncFromSupabase()
    }, INTERVALO_SYNC_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [syncFromSupabase])

  return { synced, syncFromSupabase }
}
