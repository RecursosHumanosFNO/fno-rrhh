import { useCallback } from 'react'
import type { Empleado, EmpleadoEstado, DesvinculacionInfo, User, AppNotification } from '@/types'
import { uid } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { mapEmpleadoToSupabase } from './mappers'
import { persistEmpleadoViaApi } from './persistEmpleado'

type AddNotification = (n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void

export function useEmpleadosCrud({ setEmpleados, setUsers, empleadosRef, addNotification }: {
  setEmpleados: React.Dispatch<React.SetStateAction<Empleado[]>>
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  empleadosRef: React.MutableRefObject<Empleado[]>
  addNotification: AddNotification
}) {
  const addEmpleado = useCallback((e: Omit<Empleado, 'id'>): string => {
    const id = uid()
    const nuevo = { ...e, id }
    setEmpleados(prev => [...prev, nuevo])
    addNotification({ texto: `Nuevo empleado registrado: ${e.nombre} ${e.apellido}`, tipo: 'sistema', soloAdmin: true })
    if (supabase) supabase.from('fno_empleados').insert(mapEmpleadoToSupabase(nuevo)).then(({ error }) => {
      if (error) console.error('[supabase] insert fno_empleados:', error)
    })
    return id
  }, [setEmpleados, addNotification])

  // El guardado sale del updater: antes el upsert vivía adentro de setEmpleados,
  // que React puede invocar más de una vez.
  const updateEmpleado = useCallback((id: string, data: Partial<Empleado>) => {
    const existente = empleadosRef.current.find(e => e.id === id)
    setEmpleados(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
    if (!existente || !supabase) return
    supabase.from('fno_empleados').upsert(mapEmpleadoToSupabase({ ...existente, ...data })).then()
  }, [setEmpleados, empleadosRef])

  /**
   * Revierte el cambio local si el servidor no lo confirmó.
   *
   * Las escrituras de estado van por service role: RLS bloquea los upserts
   * client-side en silencio, así que sin esto la pantalla mostraría un cambio
   * que en la base nunca ocurrió.
   */
  const revertirSiFalla = useCallback((id: string, anterior: Empleado | undefined, mensaje: string) =>
    (ok: boolean) => {
      if (ok || !anterior) return
      setEmpleados(prev => prev.map(e => e.id === id ? anterior : e))
      if (typeof window !== 'undefined') window.alert(mensaje)
    }, [setEmpleados])

  // Desactiva al empleado: guarda el registro de desvinculación + estado inactivo
  const desactivarEmpleado = useCallback((id: string, info: DesvinculacionInfo) => {
    const anterior = empleadosRef.current.find(e => e.id === id)
    setEmpleados(prev => prev.map(e => e.id === id
      ? { ...e, estado: 'inactivo' as EmpleadoEstado, desvinculacion: info }
      : e
    ))
    persistEmpleadoViaApi(id, { estado: 'inactivo', desvinculacion: info })
      .then(revertirSiFalla(id, anterior, 'No se pudo desactivar al empleado en el servidor. Intentá de nuevo.'))
  }, [setEmpleados, empleadosRef, revertirSiFalla])

  // Reactiva al empleado: la baja actual pasa al historial, no se borra.
  const reactivarEmpleado = useCallback((id: string) => {
    const anterior = empleadosRef.current.find(e => e.id === id)
    if (!anterior) return

    const historial = [
      ...(anterior.historialDesvinculaciones ?? []),
      ...(anterior.desvinculacion ? [anterior.desvinculacion] : []),
    ]
    const historialFinal = historial.length > 0 ? historial : undefined

    setEmpleados(prev => prev.map(e => e.id === id
      ? {
          ...e,
          estado: 'activo' as EmpleadoEstado,
          desvinculacion: undefined,
          historialDesvinculaciones: historialFinal,
        }
      : e
    ))

    persistEmpleadoViaApi(id, {
      estado: 'activo',
      desvinculacion: null,                       // limpiar la baja vigente
      historial_desvinculaciones: historialFinal ?? null,
    }).then(revertirSiFalla(id, anterior, 'No se pudo reactivar al empleado en el servidor. Intentá de nuevo.'))
  }, [setEmpleados, empleadosRef, revertirSiFalla])

  // Solo actualiza el estado local. El borrado real (Auth + tablas) lo hace
  // /api/admin/delete-user de forma server-side y verificada.
  const deleteEmpleado = useCallback((id: string) => {
    setEmpleados(prev => prev.filter(e => e.id !== id))
    setUsers(prev => prev.filter(u => u.empleadoId !== id))
  }, [setEmpleados, setUsers])

  return { addEmpleado, updateEmpleado, desactivarEmpleado, reactivarEmpleado, deleteEmpleado }
}
