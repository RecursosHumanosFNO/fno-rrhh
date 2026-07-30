import { useCallback } from 'react'
import type { Empleado, Recibo, ReciboFirma, AppNotification } from '@/types'
import { uid, formatMes } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapReciboToSupabase } from './mappers'
import { sendEmail } from './email'

type AddNotification = (n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void

export function useRecibosCrud({ setRecibos, setFirmas, empleadosRef, addNotification }: {
  setRecibos: React.Dispatch<React.SetStateAction<Recibo[]>>
  setFirmas: React.Dispatch<React.SetStateAction<ReciboFirma[]>>
  empleadosRef: React.MutableRefObject<Empleado[]>
  addNotification: AddNotification
}) {
  const addRecibo = useCallback((r: Omit<Recibo, 'id'>) => {
    const nuevo = { ...r, id: uid() }
    setRecibos(prev => [nuevo, ...prev])
    addNotification({
      texto: 'Nuevo recibo de sueldo disponible — verificá tu sección de recibos',
      tipo: 'recibo', empleadoId: r.empleadoId, soloEmpleado: true,
    })
    if (supabase) supabase.from('fno_recibos').insert(mapReciboToSupabase(nuevo)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_recibos:', error)
    })

    // Aviso por email al empleado. El período se arma con formatMes en vez de
    // repetir acá la lista de meses, que era una copia de la de utils.
    const emp = empleadosRef.current.find(e => e.id === r.empleadoId)
    if (emp?.email) {
      sendEmail('recibo_disponible', {
        email: emp.email,
        nombre: `${emp.nombre} ${emp.apellido}`,
        periodo: formatMes(r.mes, r.anio),
      })
    }
  }, [setRecibos, addNotification, empleadosRef])

  const deleteRecibo = useCallback((id: string) => {
    setRecibos(prev => prev.filter(r => r.id !== id))
    if (supabase) supabase.from('fno_recibos').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[supabase] delete fno_recibos:', error)
    })
  }, [setRecibos])

  // Devuelve si la firma quedó registrada: la pantalla necesita saberlo para no
  // decirle al empleado que firmó cuando el insert falló.
  const firmarRecibo = useCallback(async (reciboId: string, empleadoId: string): Promise<boolean> => {
    if (!supabase) return false
    const firma: ReciboFirma = {
      id: uid(),
      reciboId,
      empleadoId,
      firmadoEn: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }
    const { error } = await supabase.from('fno_recibo_firmas').insert({
      id: firma.id,
      recibo_id: firma.reciboId,
      empleado_id: firma.empleadoId,
      firmado_en: firma.firmadoEn,
      user_agent: firma.userAgent ?? null,
    })
    if (error) {
      console.error('[firmarRecibo] error:', error.message)
      return false
    }
    setFirmas(prev => [...prev, firma])
    return true
  }, [setFirmas])

  return { addRecibo, deleteRecibo, firmarRecibo }
}
