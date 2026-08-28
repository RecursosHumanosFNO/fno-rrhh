import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, getRequester, esGestionPersonal, Requester } from '@/lib/serverAuth'
import { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// La credencial de la ART trae nombre, CUIL y empleador: mismo trato que un
// recibo. Va al bucket PRIVADO fno-recibos, bajo el prefijo del empleado (así
// el borrado de cuenta, que limpia por prefijo, también se la lleva), y sólo se
// entrega por URL firmada corta.
const BUCKET = 'fno-recibos'
const TTL_SEGUNDOS = 600
const MAX_BYTES = 10 * 1024 * 1024

async function contexto(req: NextRequest) {
  const sb = serviceClient()
  if (!sb) return { error: NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 }) }
  const requester = await getRequester(req, sb)
  if (!requester) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  return { sb, requester }
}

async function credencialDe(sb: SupabaseClient, empleadoId: string) {
  const { data } = await sb
    .from('fno_empleados')
    .select('credencial_art, credencial_art_nombre')
    .eq('id', empleadoId)
    .maybeSingle()
  return data as { credencial_art: string | null; credencial_art_nombre: string | null } | null
}

// Ver la propia credencial es un derecho del empleado; cargarla o borrarla es
// tarea de Gestión de Personal.
const puedeVer = (r: Requester, empleadoId: string) => esGestionPersonal(r) || r.empleadoId === empleadoId

// POST /api/credencial-art — FormData { file, empleadoId }. Sube el PDF y deja
// el path en la ficha del empleado.
export async function POST(req: NextRequest) {
  try {
    const ctx = await contexto(req)
    if (ctx.error) return ctx.error
    const { sb, requester } = ctx as { sb: SupabaseClient; requester: Requester }
    if (!esGestionPersonal(requester)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    const empleadoId = String(form?.get('empleadoId') ?? '')
    if (!empleadoId) return NextResponse.json({ error: 'Falta el empleado' }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'La credencial tiene que ser un PDF' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'El archivo supera los 10 MB' }, { status: 400 })
    }

    // Si ya había una, se borra después de subir la nueva: si la subida falla,
    // el empleado se queda con la vieja y no sin nada.
    const anterior = await credencialDe(sb, empleadoId)

    const path = `${empleadoId}/credencial-art/${crypto.randomUUID()}.pdf`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
      contentType: 'application/pdf', upsert: false,
    })
    if (upErr) {
      console.error('[credencial-art] upload:', upErr.message)
      return NextResponse.json({ error: 'No se pudo subir la credencial' }, { status: 500 })
    }

    const subidaEn = new Date().toISOString()
    const nombre = file.name.slice(0, 160)
    const { error: dbErr } = await sb
      .from('fno_empleados')
      .update({
        credencial_art: path,
        credencial_art_nombre: nombre,
        credencial_art_subida_en: subidaEn,
      })
      .eq('id', empleadoId)

    if (dbErr) {
      // Sin fila actualizada el archivo queda huérfano: se limpia.
      await sb.storage.from(BUCKET).remove([path])
      console.error('[credencial-art] update:', dbErr.message)
      return NextResponse.json({ error: 'No se pudo guardar la credencial' }, { status: 500 })
    }

    if (anterior?.credencial_art) {
      await sb.storage.from(BUCKET).remove([anterior.credencial_art])
    }

    return NextResponse.json({ ok: true, path, nombre, subidaEn })
  } catch (err) {
    console.error('[credencial-art] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET /api/credencial-art?empleadoId=…&descargar=1 — URL firmada por 10 minutos.
export async function GET(req: NextRequest) {
  try {
    const ctx = await contexto(req)
    if (ctx.error) return ctx.error
    const { sb, requester } = ctx as { sb: SupabaseClient; requester: Requester }

    const empleadoId = req.nextUrl.searchParams.get('empleadoId') ?? ''
    if (!empleadoId) return NextResponse.json({ error: 'Falta el empleado' }, { status: 400 })
    if (!puedeVer(requester, empleadoId)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // El path se lee de la base, nunca del cliente: así no hay forma de pedir
    // una URL firmada de un archivo ajeno.
    const fila = await credencialDe(sb, empleadoId)
    if (!fila?.credencial_art) {
      return NextResponse.json({ error: 'No tiene credencial cargada' }, { status: 404 })
    }

    const descargar = req.nextUrl.searchParams.get('descargar')
    const nombre = (fila.credencial_art_nombre ?? 'credencial-art.pdf')
      .replace(/[^\w.\- ]/g, '_').slice(0, 120)

    const { data, error } = await sb.storage
      .from(BUCKET)
      .createSignedUrl(fila.credencial_art, TTL_SEGUNDOS, descargar ? { download: nombre } : undefined)

    if (error || !data?.signedUrl) {
      console.error('[credencial-art] signed url:', error?.message)
      return NextResponse.json({ error: 'No se pudo generar el link' }, { status: 500 })
    }
    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error('[credencial-art] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/credencial-art?empleadoId=… — saca la credencial.
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await contexto(req)
    if (ctx.error) return ctx.error
    const { sb, requester } = ctx as { sb: SupabaseClient; requester: Requester }
    if (!esGestionPersonal(requester)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const empleadoId = req.nextUrl.searchParams.get('empleadoId') ?? ''
    if (!empleadoId) return NextResponse.json({ error: 'Falta el empleado' }, { status: 400 })

    const fila = await credencialDe(sb, empleadoId)
    if (fila?.credencial_art) {
      await sb.storage.from(BUCKET).remove([fila.credencial_art])
    }
    const { error } = await sb
      .from('fno_empleados')
      .update({ credencial_art: null, credencial_art_nombre: null, credencial_art_subida_en: null })
      .eq('id', empleadoId)

    if (error) {
      console.error('[credencial-art] delete:', error.message)
      return NextResponse.json({ error: 'No se pudo borrar' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[credencial-art] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
