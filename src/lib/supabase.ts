import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('[supabase] Variables no configuradas — modo localStorage solamente')
} else {
  console.log('[supabase] Conectando a:', url.slice(0, 40) + '...')
}

// Returns null if env vars not configured — app falls back to localStorage
export const supabase = url && key ? createClient(url, key) : null
