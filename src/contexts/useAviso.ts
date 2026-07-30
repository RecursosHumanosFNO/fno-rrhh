import { useCallback } from 'react'
import type { Empleado, AppNotification } from '@/types'
import { sendEmail } from './email'

export type Canal = 'app' | 'email'

type AddNotification = (n: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void

/**
 * Aviso de una publicación (novedad o evento) respetando destinatarios.
 *
 * Novedades y eventos tenían cada uno su propia función de aviso, con el mismo
 * cuerpo repetido: repartir la notificación in-app, juntar los emails de los
 * destinatarios y dejarle al admin la confirmación de a quién se le mandó. Sólo
 * cambiaban el texto y el tipo de email, que ahora entran por parámetro.
 */
export function useAviso({ empleadosRef, addNotification }: {
  empleadosRef: React.MutableRefObject<Empleado[]>
  addNotification: AddNotification
}) {
  return useCallback((opciones: {
    titulo: string
    /** Vacío o ausente = va a todo el equipo. */
    destinatarios?: string[]
    canales: Canal[]
    textoApp: string
    emailType: string
    emailData: (emails: string[]) => Record<string, string>
  }) => {
    const { titulo, canales, textoApp, emailType, emailData } = opciones
    if (canales.length === 0) return

    const dest = opciones.destinatarios ?? []
    const empleados = empleadosRef.current

    if (canales.includes('app')) {
      if (dest.length > 0) {
        dest.forEach(empleadoId => addNotification({
          texto: textoApp, tipo: 'novedad', empleadoId, soloEmpleado: true,
        }))
      } else {
        addNotification({ texto: textoApp, tipo: 'novedad' })
      }
    }

    if (canales.includes('email')) {
      const targets = dest.length > 0
        ? empleados.filter(e => dest.includes(e.id))
        : empleados.filter(e => e.estado === 'activo')
      const emails = targets.map(e => e.email).filter(Boolean)
      if (emails.length > 0) sendEmail(emailType, emailData(emails))
    }

    // Confirmación para el admin: a quién se le envió el aviso
    const nombresDest = dest.length > 0
      ? empleados.filter(e => dest.includes(e.id)).map(e => `${e.nombre} ${e.apellido}`).join(', ') || `${dest.length} empleado(s)`
      : 'todo el equipo'
    const canalesTexto = canales.map(c => c === 'app' ? 'app' : 'mail').join(' + ')
    addNotification({
      texto: `✓ Aviso de "${titulo}" enviado a ${nombresDest} (${canalesTexto})`,
      tipo: 'sistema', soloAdmin: true,
    })
  }, [empleadosRef, addNotification])
}
