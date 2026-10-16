import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal } from '@/lib/serverAuth'
import { enviarInvitacionAcceso } from '@/lib/invitacionAcceso'

export const runtime = 'nodejs'

// Roles que puede otorgar cada quien al crear una cuenta.
//
// El rol venía en el body y se insertaba tal cual, sin validar, detrás de un
// permiso que incluye a 'rrhh'. Es decir: un usuario de Gestión de Personal
// podía crear un empleado, después crearle la cuenta con role: 'admin' y una
// contraseña elegida por él, y entrar con ella. Eso saltea justamente lo que
// 'rrhh' no puede hacer (set-role, recibos de sueldo, borrado de cuentas).
//
// Otorgar 'admin' o 'rrhh' queda sólo para un admin, igual que en set-role.
const ROLES_VALIDOS = ['admin', 'employee', 'comunicaciones', 'rrhh', 'novedades'] as const
const ROLES_QUE_PUEDE_DAR_RRHH = ['employee', 'comunicaciones', 'novedades']

// POST /api/admin/create-auth-user
// Crea un usuario en Supabase Auth y su registro en fno_users.
// El requester se valida por JWT.
// Igual que en /api/reset-password: seis caracteres se prueban por fuerza
// bruta en minutos, y esta contraseña abre recibos de sueldo y datos
// personales de terceros.
const LARGO_MINIMO_PASSWORD = 10

/**
 * Busca un usuario de Supabase Auth por email.
 *
 * La API de admin no tiene un "traeme el de este email", así que hay que
 * recorrer la lista. Con ~160 cuentas entra en la primera página; el tope de
 * páginas está por si alguna vez crece, para no quedarse recorriendo de más.
 */
async function buscarAuthUserPorEmail(
  sb: NonNullable<ReturnType<typeof serviceClient>>,
  email: string,
): Promise<{ id: string } | null> {
  const PAGINAS_MAX = 10
  for (let page = 1; page <= PAGINAS_MAX; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) return null
    const encontrado = data.users.find(u => (u.email ?? '').toLowerCase() === email)
    if (encontrado) return encontrado
    if (data.users.length < 200) return null
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, userId, empleadoId, role } = await req.json().catch(() => ({}))

    if (!email || !userId || !empleadoId || !role) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
    if (!ROLES_VALIDOS.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // El mismo mínimo que exige /api/reset-password. Estaba sólo en la pantalla
    // —y pedía seis—, así que la puerta más directa para crear una cuenta era
    // también la que admitía la contraseña más débil, y un POST a mano se
    // saltaba incluso ese seis.
    if (password && String(password).length < LARGO_MINIMO_PASSWORD) {
      return NextResponse.json(
        { error: `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres` },
        { status: 400 },
      )
    }

    // Si no llega password (fue removido del sync de Supabase por seguridad),
    // generamos una contraseña temporal fuerte que nadie conoce: la persona
    // define la suya con el link de invitación que sale más abajo.
    const effectivePassword = password || crypto.randomUUID().replace(/-/g, '') + 'Aa1!'

    const sb = serviceClient()
    if (!sb) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 })

    const requester = await getRequester(req, sb)
    if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!esGestionPersonal(requester)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    if (requester.role !== 'admin' && !ROLES_QUE_PUEDE_DAR_RRHH.includes(role)) {
      return NextResponse.json({ error: 'Solo un administrador puede otorgar ese rol' }, { status: 403 })
    }

    const emailNorm = email.toLowerCase().trim()

    // 1. El usuario de Supabase Auth.
    //
    // OJO con el orden de las cosas desde que se entra con Google: la persona
    // ya inició sesión con Google ANTES de que RRHH la apruebe —es el paso en
    // el que carga sus datos—, y ese primer inicio de sesión ya le creó el
    // usuario de Auth. Así que acá createUser falla casi siempre con "ya existe
    // un usuario con ese email", y antes eso cortaba todo: quedaba el empleado
    // creado pero sin fila en fno_users, o sea sin cuenta. Después /vincular no
    // la encontraba, la daba por "sin cuenta" y la devolvía al formulario de
    // datos. Eso es el bucle de "la aprobé y no puede entrar".
    //
    // Entonces: si ya existe, se reusa. Entrar con Google no crea el acceso
    // —eso lo sigue decidiendo RRHH acá—, pero sí crea el usuario de Auth, y
    // ese es el mismo que hay que vincular.
    let authUser = null as { id: string } | null
    let loCreamosNosotros = false

    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email: emailNorm,
      password: effectivePassword,
      email_confirm: true, // No requiere confirmación por email — el admin ya aprobó
    })

    if (authData?.user) {
      authUser = authData.user
      loCreamosNosotros = true
    } else {
      const existente = await buscarAuthUserPorEmail(sb, emailNorm)
      if (!existente) {
        console.error('[create-auth-user] auth error:', authErr?.message)
        return NextResponse.json({ error: authErr?.message ?? 'Error al crear usuario' }, { status: 400 })
      }
      authUser = existente
    }

    // 2. La fila de fno_users, que es la que el portal mira para saber quién es
    //    cada uno. Si ya hay una para ese email se actualiza en vez de insertar:
    //    así reintentar ("Crear cuenta de acceso" en la ficha) arregla en lugar
    //    de chocar con un duplicado.
    const patron = emailNorm.replace(/[\\%_]/g, (c: string) => `\\${c}`)
    const { data: cuentaExistente } = await sb
      .from('fno_users')
      .select('id')
      .ilike('email', patron)
      .maybeSingle()

    const dbErr = cuentaExistente
      ? (await sb.from('fno_users')
          .update({ email: emailNorm, role, empleado_id: empleadoId, auth_id: authUser.id })
          .eq('id', cuentaExistente.id)).error
      : (await sb.from('fno_users').insert({
          id: userId,
          email: emailNorm,
          role,
          empleado_id: empleadoId,
          auth_id: authUser.id,
          // password queda vacío: Supabase Auth lo maneja de forma segura
          password: '',
        })).error

    if (dbErr) {
      console.error('[create-auth-user] db error:', dbErr.message)
      // Revertir sólo si el usuario de Auth lo creamos en este pedido. Borrar
      // uno que ya existía dejaría a la persona sin la cuenta con la que venía
      // entrando por un error nuestro al guardar la fila.
      if (loCreamosNosotros) await sb.auth.admin.deleteUser(authUser.id)
      return NextResponse.json({ error: 'Error al crear perfil de usuario' }, { status: 500 })
    }

    // Ya aprobada, la solicitud pendiente no tiene por qué seguir ahí. Si
    // quedara, /vincular la lee y contesta "pendiente": la persona vuelve a ver
    // la pantalla de "esperá la aprobación" con el acceso ya dado.
    await sb.from('fno_pending').delete().ilike('email', patron)

    // 3. Invitación para que defina su contraseña.
    //
    // Se manda desde acá y no desde cada pantalla porque las cuentas se crean
    // en tres lugares distintos (aprobar un registro, la ficha del empleado y
    // el listado): puesto en el server, ninguno se lo puede olvidar.
    //
    // Sólo cuando la contraseña la generó el server: si vino una en el body,
    // quien creó la cuenta ya la eligió y la va a comunicar por su cuenta.
    let invitacionEnviada: boolean | null = null
    if (!password) {
      const { data: emp } = await sb
        .from('fno_empleados')
        .select('nombre')
        .eq('id', empleadoId)
        .maybeSingle()

      invitacionEnviada = await enviarInvitacionAcceso(sb, {
        email: email.toLowerCase().trim(),
        nombre: (emp?.nombre as string) ?? 'Hola',
      })
    }

    return NextResponse.json({ ok: true, authId: authUser.id, invitacionEnviada })
  } catch (err) {
    console.error('[create-auth-user] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
