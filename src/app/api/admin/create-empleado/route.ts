import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/admin/create-empleado
// Crea un registro en fno_empleados usando service role, evitando que RLS bloquee
// el insert en silencio (el insert del cliente fallaba sin avisar). Solo admin.
// Body: { empleado: <campos camelCase>, requesterId: <auth id del admin> }
export async function POST(req: NextRequest) {
  try {
    const { empleado, requesterId } = await req.json()
    if (!empleado?.id || !requesterId) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = getSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: 'Servidor no configurado' }, { status: 503 })

    // Verificar que quien crea es admin (por auth_id, con fallback por email para cuentas legacy)
    let { data: requester } = await sb
      .from('fno_users').select('role').eq('auth_id', requesterId).maybeSingle()
    if (!requester) {
      const { data: authUser } = await sb.auth.admin.getUserById(requesterId)
      if (authUser?.user?.email) {
        const { data: byEmail } = await sb
          .from('fno_users').select('role').eq('email', authUser.user.email).maybeSingle()
        requester = byEmail
      }
    }
    if (requester?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status: 403 })
    }

    // Mapear a columnas de fno_empleados (snake_case)
    const row: Record<string, unknown> = {
      id: empleado.id,
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      dni: empleado.dni ?? '',
      fecha_nacimiento: empleado.fechaNacimiento || null,
      email: (empleado.email ?? '').toLowerCase().trim(),
      telefono: empleado.telefono ?? '',
      direccion: empleado.direccion ?? '',
      cuil: empleado.cuil ?? '',
      contacto_emergencia: empleado.contactoEmergencia ?? { nombre: '', telefono: '', relacion: '' },
      sector: empleado.sector,
      cargo: empleado.cargo,
      cargos_extra: empleado.cargosExtra ?? [],
      fecha_ingreso: empleado.fechaIngreso || null,
      tipo_contrato: empleado.tipoContrato,
      jornada: empleado.jornada,
      supervisor: empleado.supervisor ?? '',
      estado: empleado.estado ?? 'activo',
      cbu: empleado.cbu ?? '',
      banco: empleado.banco ?? '',
    }

    const { error } = await sb.from('fno_empleados').insert(row)
    if (error) {
      console.error('[create-empleado] insert error:', error.message, error.code)
      const dup = error.code === '23505' || error.message.toLowerCase().includes('duplicate')
      return NextResponse.json({
        ok: false,
        error: dup
          ? 'Ya existe un empleado con ese DNI o email.'
          : `No se pudo guardar el empleado: ${error.message}`,
      }, { status: 400 })
    }

    return NextResponse.json({ ok: true, id: empleado.id })
  } catch (err) {
    console.error('[create-empleado] error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
