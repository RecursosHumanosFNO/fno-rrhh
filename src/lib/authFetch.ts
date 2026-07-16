'use client'

import { supabase } from '@/lib/supabase'

/**
 * fetch que adjunta el token de la sesión activa (Authorization: Bearer …) para
 * que las rutas server puedan verificar la identidad real del usuario en vez de
 * confiar en un id enviado en el body (que sería falsificable).
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  try {
    const { data: { session } } = await supabase!.auth.getSession()
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  } catch { /* sin sesión → la ruta responderá 401 */ }
  return fetch(input, { ...init, headers })
}
