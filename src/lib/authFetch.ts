'use client'

import { supabase } from '@/lib/supabase'

/**
 * fetch que adjunta el token de la sesión activa (Authorization: Bearer …) para
 * que las rutas server puedan verificar la identidad real del usuario en vez de
 * confiar en un id enviado en el body (que sería falsificable).
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  // Con FormData (subida de archivos) el Content-Type lo tiene que poner el
  // propio fetch: es "multipart/form-data; boundary=..." y el boundary lo
  // genera el navegador al armar el body. Forzar 'application/json' acá
  // encima rompía el parseo en el server —req.formData() no encontraba el
  // archivo— y la subida de la foto de un registro interno fallaba siempre
  // con "Falta el archivo", tanto al crear como al editar.
  const esFormData = init.body instanceof FormData
  if (!headers.has('Content-Type') && !esFormData) headers.set('Content-Type', 'application/json')
  try {
    const { data: { session } } = await supabase!.auth.getSession()
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  } catch { /* sin sesión → la ruta responderá 401 */ }
  return fetch(input, { ...init, headers })
}
