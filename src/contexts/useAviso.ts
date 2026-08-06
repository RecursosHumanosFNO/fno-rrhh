import { useCallback } from 'react'
import type { Empleado, AppNotification } from '@/types'
import { authFetch } from '@/lib/authFetch'
import { sendEmail } from './email'

/**
 * Aviso push a los dispositivos de los destinatarios.
 *
 * Va junto con la notificación in-app: marcar "notificación en la app" tiene que
 * hacer sonar el celular de quien tenga las push activadas, no sólo poner un
 * punto en la campanita que hay que entrar a mirar.
 *
 * Lista vacía = todo el equipo (la ruta lo interpreta así). El fallo no
 * interrumpe nada: la novedad ya se publicó.
 */
function enviarPush(titulo: string, cuerpo: string, url: string, empleadoIds: string[]) {
  authFetch('/api/push/send', {
    method: 'POST',
    body: JSON.stringify({ title: titulo, body: cuerpo, url, empleadoIds }),
  }).catch(() => { /* el push es no crítico */ })
}

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
  return useCallback(async (opciones: {
    titulo: string
    /** Vacío o ausente = va a todo el equipo. */
    destinatarios?: string[]
    canales: Canal[]
    textoApp: string
    /** Contenido del aviso push; viaja con el canal 'app'. */
    push: { titulo: string; cuerpo: string; url: string }
    emailType: string
    emailData: (emails: string[]) => Record<string, string>
  }) => {
    const { titulo, canales, textoApp, push, emailType, emailData } = opciones
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
      enviarPush(push.titulo, push.cuerpo, push.url, dest)
    }

    // El mail se espera para poder decir la verdad en la confirmación de abajo.
    // Antes se disparaba y se seguía de largo, así que el admin veía
    // "enviado (app + mail)" aunque Gmail hubiera rechazado el envío o el app
    // password estuviera vencido. Una confirmación que no depende del resultado
    // es peor que no tener confirmación.
    let mailOk: boolean | null = null
    if (canales.includes('email')) {
      const targets = dest.length > 0
        ? empleados.filter(e => dest.includes(e.id))
        : empleados.filter(e => e.estado === 'activo')
      const emails = targets.map(e => e.email).filter(Boolean)
      mailOk = emails.length > 0 ? await sendEmail(emailType, emailData(emails)) : false
    }

    // Confirmación para el admin: a quién se le envió el aviso
    const nombresDest = dest.length > 0
      ? empleados.filter(e => dest.includes(e.id)).map(e => `${e.nombre} ${e.apellido}`).join(', ') || `${dest.length} empleado(s)`
      : 'todo el equipo'
    const partes = canales.map(c =>
      c === 'app' ? 'app' : (mailOk ? 'mail' : 'mail NO enviado')
    ).join(' + ')
    addNotification({
      texto: mailOk === false
        ? `⚠ "${titulo}": el aviso salió a ${nombresDest} por app, pero el mail no se pudo enviar`
        : `✓ Aviso de "${titulo}" enviado a ${nombresDest} (${partes})`,
      tipo: 'sistema', soloAdmin: true,
    })
  }, [empleadosRef, addNotification])
}
