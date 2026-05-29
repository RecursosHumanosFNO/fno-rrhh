import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/admin/migrate-users
// Migración única: crea cuentas de Supabase Auth para todos los usuarios
// existentes en fno_users que aún no tienen auth_id.
// Llamar UNA sola vez después del primer deploy con Supabase Auth.
export async function POST() {
  const sb = getSupabase()
  if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

  // Buscar todos los usuarios sin auth_id (aún no migrados)
  const { data: users, error: fetchErr } = await sb
    .from('fno_users')
    .select('id, email, password, role')
    .is('auth_id', null)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ message: 'Todos los usuarios ya están migrados', results: [] })
  }

  const results = []

  for (const user of users) {
    // Crear cuenta en Supabase Auth con la contraseña actual
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email: (user.email as string).toLowerCase().trim(),
      password: (user.password as string) || 'temporal2026!',
      email_confirm: true,
    })

    if (authErr || !authData.user) {
      results.push({ email: user.email, status: 'error', reason: authErr?.message })
      continue
    }

    // Vincular auth_id en fno_users
    const { error: updateErr } = await sb
      .from('fno_users')
      .update({ auth_id: authData.user.id, password: '' }) // borrar contraseña plana
      .eq('id', user.id)

    if (updateErr) {
      results.push({ email: user.email, status: 'error', reason: updateErr.message })
    } else {
      results.push({ email: user.email, status: 'migrated', authId: authData.user.id })
    }
  }

  return NextResponse.json({ results })
}
