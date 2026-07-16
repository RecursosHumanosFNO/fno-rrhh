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
  return {
    authId: user.id,
    email: user.email ?? null,
    role: row.role as string,
    empleadoId: row.empleado_id as string,
    userId: row.id as string,
  }
}
