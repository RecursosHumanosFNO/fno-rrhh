import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/authFetch'

// Persiste cambios de un empleado vía service role (/api/perfil), bypaseando RLS.
// Los upserts client-side con anon key se bloquean silenciosamente, así que las
// escrituras importantes (estado, desvinculación) deben ir por el endpoint.
// Devuelve true si el server confirmó el guardado. Los callers pueden avisar/revertir
// si devuelve false, en vez de dejar el estado local desincronizado en silencio.
export async function persistEmpleadoViaApi(empleadoId: string, data: Record<string, unknown>): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const res = await authFetch('/api/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authId: authUser?.id, empleadoId, data }),
    })
    if (!res.ok) console.error('[perfil] persistEmpleadoViaApi falló:', res.status)
    return res.ok
  } catch (err) {
    console.error('[perfil] persistEmpleadoViaApi error de red:', err)
    return false
  }
}
