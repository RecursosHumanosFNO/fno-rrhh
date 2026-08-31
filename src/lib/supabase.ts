import { createClient } from '@supabase/supabase-js'
import { authStorage } from './authStorage'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Returns null if env vars not configured — app falls back to localStorage
export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        // localStorage o sessionStorage según "Recordar sesión" (ver authStorage).
        // En el server no hay window: ahí no se persiste nada y alcanza con el
        // storage en memoria que trae supabase-js por defecto.
        ...(typeof window !== 'undefined' ? { storage: authStorage } : {}),
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
