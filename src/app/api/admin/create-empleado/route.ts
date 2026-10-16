import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'

export const runtime = 'nodejs'

// POST /api/admin/create-empleado
// Crea un registro en fno_empleados usando service role, evitando que RLS bloquee
// el insert en silencio. El requester se valida por JWT. Solo admin.
// Body: { empleado: <campos camelCase> }
export async function POST(req: NextRequest) {
  try {
    const { empleado, reusarSiExiste } = await req.json().catch(() => ({}))
    if (!empleado?.id) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros' }, { status: 400 })
    }

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ ok: false, error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    if (!esGestionPersonal(requester)) return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status: 403 })

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

    // Aprobar una solicitud se hace en dos pasos (este legajo, y después la
    // cuenta). Si el segundo fallaba, el legajo quedaba creado, y volver a
    // aprobar chocaba acá con "ya existe un empleado con ese email": la
    // aprobación se cortaba antes de llegar a crear la cuenta, así que por más
    // veces que se aprobara, la persona nunca tenía acceso.
    //
    // Con reusarSiExiste (lo manda sólo la aprobación) se devuelve el legajo
    // que ya está y se sigue con la cuenta. Va por email y no por DNI a
    // propósito: el email es lo que Google verificó; un DNI repetido puede ser
    // de otra persona y ahí sí tiene que fallar. Al cargar un empleado a mano
    // ("Nuevo empleado") no viene el flag: avisar del duplicado es lo correcto.
    if (reusarSiExiste === true && row.email) {
      const patron = String(row.email).replace(/[\\%_]/g, (c: string) => `\\${c}`)
      const { data: existente } = await sb
        .from('fno_empleados')
        .select('id')
        .ilike('email', patron)
        .maybeSingle()
      if (existente) return NextResponse.json({ ok: true, id: existente.id, existente: true })
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
