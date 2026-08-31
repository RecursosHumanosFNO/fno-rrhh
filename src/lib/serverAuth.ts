import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Cliente con service role (bypasea RLS). Solo server-side.
export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function bearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization') ?? ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null
}

export interface Requester {
  authId: string
  email: string | null
  role: string
  empleadoId: string
  userId: string
}

/**
 * Gestión de Personal: 'admin' y 'rrhh' comparten las tareas de RRHH del día a
 * día (empleados, solicitudes, tickets, registros internos).
 *
 * Lo que NO entra acá y queda sólo para 'admin': recibos de sueldo y la
 * administración de cuentas (roles, emails, borrado de usuarios).
 */
export function esGestionPersonal(r: Requester | null): boolean {
  return r?.role === 'admin' || r?.role === 'rrhh'
}

// Identifica al que hace el request validando su JWT de Supabase (NO un id que
// manda el cliente, que sería falsificable). Devuelve su fila de fno_users o null.
export async function getRequester(req: NextRequest, sb: SupabaseClient): Promise<Requester | null> {
  const token = bearerToken(req)
  if (!token) return null
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  const { data: row } = await sb
    .from('fno_users')
    .select('id, role, empleado_id, email')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (!row) return null

  // Un empleado dado de baja no puede seguir operando. El chequeo de
  // `estado === 'inactivo'` vivía sólo en el cliente, DESPUÉS de que Supabase ya
  // había emitido un token válido: con ese token en la mano —sin ejecutar el JS
  // del portal— la persona seguía entrando a todas estas rutas. Acá se corta
  // para todas de una vez.
  if (row.empleado_id) {
    const { data: emp } = await sb
      .from('fno_empleados')
      .select('estado')
      .eq('id', row.empleado_id)
      .maybeSingle()
    if (emp?.estado === 'inactivo') return null
  }
  return {
    authId: user.id,
    email: user.email ?? null,
    role: row.role as string,
    empleadoId: row.empleado_id as string,
    userId: row.id as string,
  }
}
